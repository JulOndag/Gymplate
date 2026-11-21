import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  QueryConstraint,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Query,
  DocumentReference,
  Unsubscribe,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import {
  Auth,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { firebaseConfig, firestore } from '../firebase';
import {
  ActivityLog,
  Business,
  Notification,
  Order,
  Product,
  SellerApplication,
  User, Review, Report } from '../models';
import { MockDataService } from './mock-data.service';

/**
 * Talks to Firestore for sellers, applications, businesses and admin activity logs.
 *
 * How it works:
 *  1. When someone logs in, startFor() loads their data from Firestore into the
 *     in-memory store (MockDataService). The existing pages keep reading from it.
 *  2. Listeners keep that store up to date while the person is logged in.
 *  3. Every change is saved here (to Firestore) first. The Security Rules decide if it is allowed.
 */

const DATE_KEYS = ['submittedAt', 'updatedAt', 'reviewedAt', 'createdAt', 'timestamp'];

/** [ORDERS-FS #1] Orders have dates inside lists too (statusHistory), so turn ISO text back into Dates everywhere. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function reviveDates<T>(value: unknown): T {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => reviveDates(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = reviveDates(v);
    return out as T;
  }
  return value as T;
}

/** Shown to the customer when a meal ran out (or was removed) while they were checking out. */
class StockError extends Error {}

/** Firestore needs plain data: turn Dates into text and drop undefined values. */
function toPlain(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = toPlain(v);
    }
    return out;
  }
  return value;
}

/** Turn the saved date text back into Date objects. */
function fromPlain<T>(data: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...data };
  for (const key of DATE_KEYS) {
    if (typeof out[key] === 'string') out[key] = new Date(out[key] as string);
  }
  return out as T;
}

@Injectable({ providedIn: 'root' })
export class CloudStoreService {
  /** Firestore error code of the last failed meal save (e.g. 'permission-denied'). Shown to help fix problems. */
  lastErrorCode = '';

  private unsubs: Unsubscribe[] = [];
  private pending: (() => void)[] = [];
  private startedFor: string | null = null;
  private starting: Promise<void> | null = null;

  /** Goes up every time Firestore data arrives. Pages watch it to refresh themselves. */
  readonly version = signal(0);

  /** [LIVE] Screens redraw when this goes up. Call it after changing the local copy of the data. */
  notifyChange(): void {
    this.version.update((v) => v + 1);
  }

  constructor(private mockData: MockDataService) {
    // [ORDERS-FS #2] Every notification the app creates or marks as read is also saved to Firestore.
    this.mockData.notificationSync = {
      save: (n) => {
        void this.saveNotification(n);
      },
      // [LIVE-FIX] Marking as read sends ONLY { isRead: true }, exactly what the rules allow.
      markRead: (id) => {
        void this.markNotificationRead(id);
      },
    };
  }

  // ─── Loading ─────────────────────────────────────────────────────────

  /** Load this person's data and keep it updated. Waits for the first load. */
  startFor(user: User): Promise<void> {
    // Login can trigger this twice at almost the same time. Reuse the first call
    // instead of restarting (restarting would cancel the listeners of the first call).
    if (this.startedFor === user.id && this.starting) return this.starting;
    this.stop();
    this.startedFor = user.id;
    // Never wait longer than 8 seconds for the first load (for example, when offline).
    this.starting = Promise.race([
      this.load(user),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
    return this.starting;
  }

  private async load(user: User): Promise<void> {
    try {
      if (user.role === 'admin') {
        await Promise.all([
          // [PRODUCTS-FS #1] the admin sees every meal (including disabled ones)
          this.watchCollection('products', (docs) =>
            this.mockData.replaceCloudProducts(docs.map((d) => fromPlain<Product>(d.data))),
          ),
          this.watchCollection('sellerApplications', (docs) =>
            this.mockData.replaceSellerApplications(
              docs.map((d) => fromPlain<SellerApplication>(d.data)),
            ),
          ),
          this.watchCollection('businesses', (docs) =>
            this.mockData.replaceCloudBusinesses(docs.map((d) => fromPlain<Business>(d.data))),
          ),
          this.watchCollection('activityLogs', (docs) =>
            this.mockData.replaceActivityLogs(
              docs
                .map((d) => fromPlain<ActivityLog>(d.data))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            ),
          ),
          this.watchCollection('users', (docs) =>
            this.mockData.upsertUsers(docs.map((d) => fromPlain<User>({ ...d.data, id: d.id }))),
          ),
          // [ORDERS-FS #3] the admin sees every order
          this.watchCollection('orders', (docs) =>
            this.mockData.replaceCloudOrders(docs.map((d) => reviveDates<Order>(d.data))),
          ),
          this.watchNotifications(user.id),
          // [REVIEWS-FS #6] [REPORTS-FS #4] the admin sees every review and every report
          this.watchReviews(),
          this.watchReports(),
        ]);
      } else if (user.role === 'seller') {
        await Promise.all([
          // [PRODUCTS-FS #1] a seller sees only their own meals (the query must match the rule)
          this.watchCollection(
            'products',
            (docs) =>
              this.mockData.replaceCloudProducts(docs.map((d) => fromPlain<Product>(d.data))),
            [where('sellerId', '==', user.id)],
          ),
          this.watchDocument('sellerApplications', user.id, (data) =>
            this.mockData.replaceSellerApplications(
              data ? [fromPlain<SellerApplication>(data)] : [],
            ),
          ),
          this.watchDocument('businesses', user.id, (data) =>
            this.mockData.replaceCloudBusinesses(data ? [fromPlain<Business>(data)] : []),
          ),
          // [ORDERS-FS #3] a seller sees only the orders placed with their kitchen (the query must match the rule)
          this.watchCollection(
            'orders',
            (docs) => this.mockData.replaceCloudOrders(docs.map((d) => reviveDates<Order>(d.data))),
            [where('sellerId', '==', user.id)],
          ),
          this.watchNotifications(user.id),
          // [REVIEWS-FS #6] [REPORTS-FS #4] a seller sees only the reviews and reports about their own kitchen
          this.watchReviews([where('sellerId', '==', user.id)]),
          this.watchReports([where('sellerId', '==', user.id)]),
        ]);
      } else {
        await Promise.all([
          this.watchCollection('businesses', (docs) =>
            this.mockData.replaceCloudBusinesses(docs.map((d) => fromPlain<Business>(d.data))),
          ),
          // [PRODUCTS-FS #1] a customer sees only meals that are NOT disabled by the admin
          this.watchCollection(
            'products',
            (docs) =>
              this.mockData.replaceCloudProducts(docs.map((d) => fromPlain<Product>(d.data))),
            [where('isDisabled', '==', false), where('nutritionStatus', '==', 'verified')], // [NUTRITION-GATE] customers see only meals the admin verified
          ),
          // [ORDERS-FS #3] a customer sees only their own orders
          this.watchCollection(
            'orders',
            (docs) => this.mockData.replaceCloudOrders(docs.map((d) => reviveDates<Order>(d.data))),
            [where('customerId', '==', user.id)],
          ),
          this.watchNotifications(user.id),
          // [REVIEWS-FS #6] reviews are public (stars on every meal); a customer sees only their own reports
          this.watchReviews(),
          this.watchReports([where('customerId', '==', user.id)]),
        ]);
      }
    } catch (e) {
      console.error('Could not load data from Firestore:', e);
    }
  }

  /** [REVIEWS-FS #6] Reviews. Everyone may read them (they show the stars on each meal). */
  private watchReviews(constraints: QueryConstraint[] = []): Promise<void> {
    return this.watchCollection(
      'reviews',
      (docs) => this.mockData.replaceCloudReviews(docs.map((d) => reviveDates<Review>(d.data))),
      constraints,
    );
  }

  /** [REPORTS-FS #4] Food reports. The query must match the rule (customer / seller / admin). */
  private watchReports(constraints: QueryConstraint[] = []): Promise<void> {
    return this.watchCollection(
      'reports',
      (docs) => this.mockData.replaceCloudReports(docs.map((d) => reviveDates<Report>(d.data))),
      constraints,
    );
  }

  /** [ORDERS-FS #4] Each person gets only their own notifications. */
  private watchNotifications(userId: string): Promise<void> {
    return this.watchCollection(
      'notifications',
      (docs) =>
        this.mockData.replaceCloudNotifications(docs.map((d) => fromPlain<Notification>(d.data))),
      [where('userId', '==', userId)],
    );
  }

  /** Stop listening (on logout). */
  stop(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    // Release anything still waiting for a first load, so no screen waits forever.
    this.pending.forEach((release) => release());
    this.pending = [];
    this.startedFor = null;
    this.starting = null;
  }

  /** [PRODUCTS-FS #2] For visitors who are not logged in: load the live meals (public menu). */
  startPublic(): Promise<void> {
    if (this.startedFor) return this.starting ?? Promise.resolve();
    this.startedFor = 'public';
    this.starting = Promise.race([
      Promise.all([
        this.watchCollection(
          'products',
          (docs) => this.mockData.replaceCloudProducts(docs.map((d) => fromPlain<Product>(d.data))),
          [where('isDisabled', '==', false), where('nutritionStatus', '==', 'verified')], // [NUTRITION-GATE] customers see only meals the admin verified
        ),
        this.watchReviews(), // [REVIEWS-FS #6] visitors see the stars too
      ]).then(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
    return this.starting;
  }

  /**
   * [LIVE-FIX] One place that starts a Firestore listener.
   * Before: if a listener hit an error (network problem, permission, quota) it was gone for good,
   * so the screen stayed frozen until the page was refreshed.
   * Now: after an error it starts again by itself (1s, 2s, 4s ... up to 30s).
   * A 'permission-denied' error is retried only 3 times, because retrying will not fix a rules problem.
   */
  private listen(
    label: string,
    source: Query | DocumentReference,
    handle: (snap: any) => void,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      let first = true;
      let attempt = 0;
      let stopped = false;
      let unsub: Unsubscribe | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const release = () => {
        if (first) {
          first = false;
          resolve();
        }
      };
      this.pending.push(release);

      const start = () => {
        unsub = onSnapshot(
          source as any,
          (snap: any) => {
            attempt = 0; // it works again, so the next error starts the wait from 1s again
            handle(snap);
            this.version.update((v) => v + 1);
            release();
          },
          (err: { code?: string; message?: string }) => {
            console.error(`Firestore listener "${label}" failed (${err.code}):`, err.message);
            release();
            unsub?.();
            unsub = null;
            const limit = err.code === 'permission-denied' ? 3 : Infinity;
            if (stopped || attempt >= limit) return;
            const wait = Math.min(30000, 1000 * 2 ** attempt++);
            console.warn(`[Firestore] restarting "${label}" in ${wait / 1000}s`);
            timer = setTimeout(() => {
              if (!stopped) start();
            }, wait);
          },
        );
      };

      start();
      this.unsubs.push(() => {
        stopped = true;
        if (timer) clearTimeout(timer);
        unsub?.();
      });
    });
  }

  private watchCollection(
    name: string,
    apply: (docs: { id: string; data: Record<string, unknown> }[]) => void,
    constraints: QueryConstraint[] = [], // [PRODUCTS-FS #3] optional filter, e.g. where('sellerId', '==', uid)
  ): Promise<void> {
    const source: Query = constraints.length
      ? query(collection(firestore, name), ...constraints)
      : collection(firestore, name);
    return this.listen(name, source, (snap) => {
      console.info(`[Firestore] ${name}: ${snap.size} document(s) loaded`);
      apply(snap.docs.map((d: any) => ({ id: d.id, data: d.data() })));
    });
  }

  private watchDocument(
    name: string,
    id: string,
    apply: (data: Record<string, unknown> | null) => void,
  ): Promise<void> {
    return this.listen(`${name}/${id}`, doc(firestore, name, id), (snap) => {
      console.info(`[Firestore] ${name}/${id}: ${snap.exists() ? 'found' : 'not found'}`);
      apply(snap.exists() ? snap.data() : null);
    });
  }

  // ─── Saving (each returns true if Firestore accepted it) ─────────────

  /**
   * Document ID of an application.
   * Before approval the applicant has no account yet (userId is empty), so the application's own id is used.
   * After approval the document is stored under the new seller's UID.
   */
  private appDocId(app: SellerApplication): string {
    return app.userId || app.id;
  }

  async saveApplication(app: SellerApplication): Promise<boolean> {
    try {
      await setDoc(
        doc(firestore, 'sellerApplications', this.appDocId(app)),
        toPlain(app) as Record<string, unknown>,
      );
      return true;
    } catch (e) {
      console.error('saveApplication failed:', e);
      return false;
    }
  }

  /** Approving = update the application AND create the business, together or not at all. */
  async approveApplication(app: SellerApplication, business: Business): Promise<boolean> {
    try {
      const batch = writeBatch(firestore);
      batch.set(
        doc(firestore, 'sellerApplications', this.appDocId(app)),
        toPlain(app) as Record<string, unknown>,
      );
      batch.set(
        doc(firestore, 'businesses', business.sellerId),
        toPlain(business) as Record<string, unknown>,
      );
      await batch.commit();
      return true;
    } catch (e) {
      console.error('approveApplication failed:', e);
      return false;
    }
  }

  // ─── Approving a seller who has no account yet ───────────────────────

  private provAuth?: Auth;

  /**
   * A second, separate Firebase connection used ONLY to create the seller's account.
   * Creating a user signs that user in, so doing it on the main connection would
   * log the administrator out. In-memory persistence = nothing is remembered in the browser.
   */
  private provisioningAuth(): Auth {
    if (!this.provAuth) {
      const name = 'seller-provisioning';
      const app = getApps().find((a) => a.name === name) ?? initializeApp(firebaseConfig, name);
      this.provAuth = initializeAuth(app, { persistence: inMemoryPersistence });
    }
    return this.provAuth;
  }

  /** Long random value that nobody sees, stores or sends. The seller replaces it through the emailed link. */
  private unusedPassword(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Approve an applicant that has no account yet:
   *  1. create their Firebase account (with a random password nobody ever sees),
   *  2. save the profile, the approved application and the storefront together,
   *  3. have Firebase email them a link to create their own password.
   * If step 2 fails, the new account is deleted again so nothing is left half-done.
   */
  async approveNewSeller(
    app: SellerApplication,
    business: Business,
  ): Promise<{
    ok: boolean;
    message?: string;
    emailSent?: boolean;
    application?: SellerApplication;
    business?: Business;
  }> {
    const email = app.businessInfo.businessEmail.trim();
    const auth = this.provisioningAuth();

    let created: FirebaseUser;
    try {
      created = (await createUserWithEmailAndPassword(auth, email, this.unusedPassword())).user;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      console.error('Creating the seller account failed:', e);
      return {
        ok: false,
        message:
          code === 'auth/email-already-in-use'
            ? 'An account with this email already exists, so a new seller account cannot be created. Ask the applicant to use a different email.'
            : code === 'auth/invalid-email'
              ? 'The applicant email is not valid.'
              : 'Could not create the seller account. Check your connection and try again.',
      };
    }

    const uid = created.uid;
    const now = new Date();
    const finalApp: SellerApplication = { ...app, userId: uid };
    const finalBusiness: Business = { ...business, sellerId: uid };
    const profile: User = {
      id: uid,
      email: created.email || email.toLowerCase(),
      role: 'seller',
      firstName: app.personalInfo.firstName,
      lastName: app.personalInfo.lastName,
      phone: app.personalInfo.phone,
      address: app.personalInfo.address,
      city: app.personalInfo.city,
      state: app.personalInfo.state,
      zipCode: app.personalInfo.zipCode,
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    try {
      const batch = writeBatch(firestore);
      const { id: _id, ...profileData } = profile;
      batch.set(doc(firestore, 'users', uid), toPlain(profileData) as Record<string, unknown>);
      batch.set(
        doc(firestore, 'sellerApplications', uid),
        toPlain(finalApp) as Record<string, unknown>,
      );
      batch.delete(doc(firestore, 'sellerApplications', app.id)); // move it from the temporary id to the seller's UID
      batch.set(
        doc(firestore, 'businesses', uid),
        toPlain(finalBusiness) as Record<string, unknown>,
      );
      await batch.commit();
    } catch (e) {
      console.error('Saving the approved seller failed:', e);
      try {
        await deleteUser(created);
      } catch {
        /* nothing more we can do */
      }
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        message:
          'Could not save the approval. Nothing was changed. Check that you are logged in as an administrator.',
      };
    }

    // Firebase emails the seller a link to create their own password.
    let emailSent = true;
    try {
      await sendPasswordResetEmail(auth, email, { url: window.location.origin + '/auth/login' });
    } catch {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch {
        emailSent = false;
      }
    }
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }

    return { ok: true, emailSent, application: finalApp, business: finalBusiness };
  }

  async saveBusiness(business: Business): Promise<boolean> {
    try {
      await setDoc(
        doc(firestore, 'businesses', business.sellerId),
        toPlain(business) as Record<string, unknown>,
      );
      return true;
    } catch (e) {
      console.error('saveBusiness failed:', e);
      return false;
    }
  }

  // [PRODUCTS-FS #4] Save / delete a meal. Firestore rules decide if it is allowed.
  async saveProduct(product: Product): Promise<boolean> {
    try {
      // [REVIEWS-FS #4] rating / reviewCount are calculated from the reviews, never saved on the meal.
      const { rating, reviewCount, ...data } = product;
      await setDoc(
        doc(firestore, 'products', product.id),
        toPlain(data) as Record<string, unknown>,
      );
      this.lastErrorCode = '';
      return true;
    } catch (e) {
      console.error('saveProduct failed:', e);
      this.lastErrorCode = (e as { code?: string })?.code || 'unknown';
      return false;
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'products', productId));
      return true;
    } catch (e) {
      console.error('deleteProduct failed:', e);
      return false;
    }
  }

  // ─── [ORDERS-FS #5] Orders ───────────────────────────────────────────

  /**
   * Place an order and take the stock in ONE transaction:
   * either the order is saved AND the stock goes down, or nothing changes.
   * This also stops two customers from buying the last portion at the same time.
   */
  async placeOrder(order: Order): Promise<{ success: boolean; message: string }> {
    const need = new Map<string, number>();
    order.items.forEach((i) => need.set(i.productId, (need.get(i.productId) ?? 0) + i.quantity));
    const lines = [...need.entries()];

    try {
      await runTransaction(firestore, async (tx) => {
        // all reads first, then the writes
        const snaps = await Promise.all(
          lines.map(([id]) => tx.get(doc(firestore, 'products', id))),
        );
        const now = new Date().toISOString();
        snaps.forEach((snap, i) => {
          const [id, qty] = lines[i];
          const name = order.items.find((x) => x.productId === id)?.productName ?? 'A meal';
          if (!snap.exists()) throw new StockError(`${name} is no longer available.`);
          const data = snap.data();
          const stock = typeof data['stock'] === 'number' ? data['stock'] : 0;
          if (data['isDisabled'] === true || data['isAvailable'] === false || stock < qty) {
            throw new StockError(`${name} is no longer available in the requested quantity.`);
          }
          const left = stock - qty;
          tx.update(snap.ref, { stock: left, isAvailable: left > 0, updatedAt: now });
        });
        tx.set(doc(firestore, 'orders', order.id), toPlain(order) as Record<string, unknown>);
      });
      return { success: true, message: '' };
    } catch (e) {
      if (e instanceof StockError) return { success: false, message: e.message };
      console.error('placeOrder failed:', e);
      return {
        success: false,
        message: 'Could not place your order. Check your connection and try again.',
      };
    }
  }

  /** Archive / restore an order for the seller or the admin. Only that one field is sent. */
  async setOrderArchived(
    orderId: string,
    key: 'archivedBySeller' | 'archivedByAdmin' | 'archivedByCustomer',
    value: boolean,
  ): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'orders', orderId), { [key]: value });
      return true;
    } catch (e) {
      console.error('setOrderArchived failed:', e);
      return false;
    }
  }

  /**
   * Save a status change. Only the fields that can change are sent, so the Security Rules
   * can check exactly what the seller / customer is allowed to touch.
   * When an order is cancelled, the stock is given back (one small transaction per meal).
   */
  async saveOrderUpdate(
    order: Order,
    restoreStock: { productId: string; quantity: number }[] = [],
  ): Promise<boolean> {
    try {
      const patch = toPlain({
        status: order.status,
        statusHistory: order.statusHistory,
        paymentStatus: order.paymentStatus,
        prepMinutes: order.prepMinutes,
        estimatedReadyAt: order.estimatedReadyAt,
        updatedAt: order.updatedAt,
      }) as Record<string, unknown>;
      await updateDoc(doc(firestore, 'orders', order.id), patch);
    } catch (e) {
      console.error('saveOrderUpdate failed:', e);
      return false;
    }

    // The order is already cancelled. Giving the stock back is best-effort (a meal may have been removed).
    for (const line of restoreStock) {
      try {
        await runTransaction(firestore, async (tx) => {
          const ref = doc(firestore, 'products', line.productId);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const data = snap.data();
          const stock = typeof data['stock'] === 'number' ? data['stock'] : 0;
          tx.update(ref, {
            stock: stock + line.quantity,
            isAvailable: stock === 0 ? true : data['isAvailable'] !== false,
            updatedAt: new Date().toISOString(),
          });
        });
      } catch (e) {
        console.warn('Could not give the stock back for', line.productId, e);
      }
    }
    return true;
  }

  /**
   * Notifications: the document ID is the notification id.
   * [LIVE-FIX] Tries twice. Before, one failed write was lost silently and the other person
   * never got the notification.
   */
  async saveNotification(n: Notification): Promise<boolean> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await setDoc(doc(firestore, 'notifications', n.id), toPlain(n) as Record<string, unknown>);
        return true;
      } catch (e) {
        console.error(`saveNotification failed (try ${attempt} of 2):`, e);
        if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
      }
    }
    return false;
  }

  /** [LIVE-FIX] Mark as read = change ONLY isRead. The rules allow exactly this and nothing else. */
  async markNotificationRead(id: string): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'notifications', id), { isRead: true });
      return true;
    } catch (e) {
      console.error('markNotificationRead failed:', e);
      this.notifyChange(); // Firestore put it back to unread, so redraw
      return false;
    }
  }

  /** [REVIEWS-FS #2] Save one review. Document ID = orderId_productId, so a meal can be reviewed once per order. */
  async saveReview(review: Review): Promise<boolean> {
    try {
      const { productImageUrl, ...data } = review; // the photo is not copied into the review
      await setDoc(doc(firestore, 'reviews', review.id), toPlain(data) as Record<string, unknown>);
      return true;
    } catch (e) {
      console.error('saveReview failed:', e);
      return false;
    }
  }

  /** [REPORTS-FS #2] Create or update a report (customer files it, seller replies, admin decides). */
  async saveReport(report: Report): Promise<boolean> {
    try {
      const { productImageUrl, ...data } = report; // the photo is not copied into the report
      await setDoc(doc(firestore, 'reports', report.id), toPlain(data) as Record<string, unknown>);
      return true;
    } catch (e) {
      console.error('saveReport failed:', e);
      return false;
    }
  }

  async addActivityLog(log: ActivityLog): Promise<boolean> {
    try {
      await setDoc(doc(firestore, 'activityLogs', log.id), toPlain(log) as Record<string, unknown>);
      return true;
    } catch (e) {
      console.error('addActivityLog failed:', e);
      return false;
    }
  }

  async setUserStatus(uid: string, status: 'active' | 'suspended'): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, 'users', uid), {
        accountStatus: status,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('setUserStatus failed:', e);
      return false;
    }
  }
}
