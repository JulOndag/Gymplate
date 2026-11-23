import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  reauthenticateWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase';
import { User } from '../models';
import { MockDataService } from './mock-data.service';
import { CloudStoreService } from './cloud-store.service';

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  code?: string; // Firebase error code, for example 'auth/email-already-in-use'
  needsPassword?: boolean; // [GOOGLE-PASSWORD] True when the account exists but has no password yet
}

/**
 * Handles login, registration, logout and the current user.
 *
 * - Passwords are handled ONLY by Firebase Authentication (never stored by us).
 * - The user's role (customer / seller / admin) is stored in Firestore: users/{uid}.
 * - Anyone who registers can only become 'customer' or 'seller'.
 *   Admin accounts are created manually in the Firebase console.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);
  private verified = signal(false);
  /** [GOOGLE-PASSWORD] Which sign-in methods this account has, e.g. ['google.com'] or ['google.com', 'password']. */
  private providers = signal<string[]>([]);
  /** True while register()/Google login is still creating the profile, so the auth listener does not interfere. */
  private authBusy = false;

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly isCustomer = computed(() => this.currentUser()?.role === 'customer');
  readonly isSeller = computed(() => this.currentUser()?.role === 'seller');
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly isEmailVerified = this.verified.asReadonly();
  /** [GOOGLE-PASSWORD] True when the account can log in with an email and password. */
  readonly hasPasswordLogin = computed(() => this.providers().includes('password'));
  /** [GOOGLE-PASSWORD] True when the person signed up with Google and never created a password. */
  readonly isGoogleOnly = computed(
    () => this.providers().includes('google.com') && !this.providers().includes('password'),
  );

  /** Resolves once Firebase has finished checking if someone is already logged in. */
  readonly ready: Promise<void>;

  constructor(
    private mockData: MockDataService,
    private router: Router,
    private cloud: CloudStoreService,
  ) {
    this.ready = new Promise<void>((resolve) => {
      onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (this.authBusy) {
          resolve();
          return;
        }
        if (fbUser) {
          const profile = await this.loadProfile(fbUser.uid);
          if (profile && profile.accountStatus === 'active') {
            await this.cloud.startFor(profile);
            this.setUser(profile, fbUser);
          } else {
            this.clearUser();
          }
        } else {
          this.clearUser();
        }
        resolve();
      });
    });
  }

  // ─── Login / Register ────────────────────────────────────────────────

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      return await this.finishLogin(cred.user);
    } catch (err) {
      return { success: false, message: this.friendlyError(err) };
    }
  }

  async adminLogin(email: string, password: string): Promise<AuthResult> {
    const result = await this.login(email, password);
    if (result.success && result.user?.role !== 'admin') {
      await this.logout(false);
      return { success: false, message: 'This login is for administrators only.' };
    }
    return result;
  }

  async loginWithGoogle(): Promise<AuthResult> {
    this.authBusy = true;
    try {
      const cred = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      let profile = await this.loadProfile(cred.user.uid);
      if (!profile) {
        // First Google login: always a customer account.
        const [firstName, ...rest] = (cred.user.displayName || 'GymPlate User').split(' ');
        profile = this.newProfile(cred.user.uid, cred.user.email || '', {
          firstName,
          lastName: rest.join(' '),
          phone: '',
          role: 'customer',
        });
        await setDoc(doc(firestore, 'users', cred.user.uid), this.toFirestore(profile));
      }
      const result = await this.finishLogin(cred.user);
      if (result.success) {
        result.needsPassword = this.isGoogleOnly();
      }
      return result;
    } catch (err) {
      return { success: false, message: this.friendlyError(err) };
    } finally {
      this.authBusy = false;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'customer' | 'seller';
  }): Promise<AuthResult> {
    this.authBusy = true;
    try {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        userData.email.trim(),
        userData.password,
      );
      // Use the email exactly as Firebase stores it (always lowercase) so it matches the security rule.
      const profile = this.newProfile(
        cred.user.uid,
        cred.user.email || userData.email.trim().toLowerCase(),
        userData,
      );
      await setDoc(doc(firestore, 'users', cred.user.uid), this.toFirestore(profile));
      await this.cloud.startFor(profile); // start loading this person's Firestore data
      this.setUser(profile, cred.user);
      // Verification email helps block fake accounts.
      try {
        await sendEmailVerification(cred.user);
      } catch {
        /* not critical */
      }
      return { success: true, message: 'Account created successfully!', user: profile };
    } catch (err) {
      return {
        success: false,
        message: this.friendlyError(err),
        code: (err as { code?: string })?.code,
      };
    } finally {
      this.authBusy = false;
    }
  }

  async logout(navigate = true): Promise<void> {
    await signOut(firebaseAuth);
    this.clearUser();
    if (navigate) this.router.navigate(['/']);
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch {
      // Same result either way, so nobody can find out which emails have accounts.
    }
  }

  async resendVerificationEmail(): Promise<boolean> {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) return false;
    try {
      await sendEmailVerification(fbUser);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Password for Google accounts ────────────────────────────────────

  /**
   * [GOOGLE-PASSWORD] Lets a person who signed up with Google create a GymPlate password
   * from inside the app (no email link needed). Afterwards the same account can log in
   * with Google OR with email + password, because Firebase keeps both methods on ONE account.
   *
   * It also works to change the password of an account that already has one.
   */
  async setPassword(newPassword: string): Promise<AuthResult> {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser || !fbUser.email) {
      return { success: false, message: 'Please log in first.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Password is too weak. Use at least 6 characters.' };
    }
    try {
      try {
        await this.linkPassword(fbUser, newPassword);
      } catch (err) {
        // Firebase asks for a fresh login before changing sign-in methods. Ask Google once more, then retry.
        if ((err as { code?: string })?.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(fbUser, new GoogleAuthProvider());
          await this.linkPassword(fbUser, newPassword);
        } else {
          throw err;
        }
      }
      this.providers.set(fbUser.providerData.map((p) => p.providerId));
      return {
        success: true,
        message: 'Password saved. You can now log in with your email and password, or with Google.',
      };
    } catch (err) {
      return {
        success: false,
        message: this.friendlyError(err),
        code: (err as { code?: string })?.code,
      };
    }
  }

  private async linkPassword(fbUser: FirebaseUser, password: string): Promise<void> {
    const alreadyHasPassword = fbUser.providerData.some((p) => p.providerId === 'password');
    if (alreadyHasPassword) {
      await updatePassword(fbUser, password);
    } else {
      await linkWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email!, password));
    }
  }

  // ─── Profile ─────────────────────────────────────────────────────────

  /** Users can change their own contact details only. Role and status are protected by Firestore rules. */
  async updateProfile(updates: Partial<User>): Promise<boolean> {
    const user = this.currentUser();
    if (!user) return false;
    const safe = {
      firstName: updates.firstName ?? user.firstName,
      lastName: updates.lastName ?? user.lastName,
      phone: updates.phone ?? user.phone,
      address: updates.address ?? user.address,
      city: updates.city ?? user.city,
      state: updates.state ?? user.state,
      zipCode: updates.zipCode ?? user.zipCode,
      updatedAt: new Date().toISOString(),
    };
    try {
      await updateDoc(doc(firestore, 'users', user.id), safe);
      const updated: User = { ...user, ...safe, updatedAt: new Date(safe.updatedAt) };
      this.currentUser.set(updated);
      this.syncToMock(updated);
      return true;
    } catch {
      return false;
    }
  }

  /** [PROFILE-PHOTO] Save (or remove, with '') the person's own profile picture. */
  async setAvatar(dataUrl: string): Promise<boolean> {
    const user = this.currentUser();
    if (!user) return false;
    const updatedAt = new Date().toISOString();
    try {
      await updateDoc(doc(firestore, 'users', user.id), { avatarUrl: dataUrl, updatedAt });
      const updated: User = { ...user, avatarUrl: dataUrl, updatedAt: new Date(updatedAt) };
      this.currentUser.set(updated);
      this.syncToMock(updated);
      return true;
    } catch (e) {
      console.error('setAvatar failed:', e);
      return false;
    }
  }

  async refreshUser(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    const fresh = await this.loadProfile(user.id);
    if (fresh) this.currentUser.set(fresh);
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  private async finishLogin(fbUser: FirebaseUser): Promise<AuthResult> {
    const profile = await this.loadProfile(fbUser.uid);
    if (!profile) {
      await this.logout(false);
      return { success: false, message: 'Account profile not found. Please contact support.' };
    }
    if (profile.accountStatus === 'suspended') {
      await this.logout(false);
      return {
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      };
    }
    await this.cloud.startFor(profile);
    this.setUser(profile, fbUser);
    return { success: true, message: 'Login successful!', user: profile };
  }

  private async loadProfile(uid: string): Promise<User | null> {
    try {
      const snap = await getDoc(doc(firestore, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        id: uid,
        email: d['email'] ?? '',
        role: d['role'],
        firstName: d['firstName'] ?? '',
        lastName: d['lastName'] ?? '',
        phone: d['phone'] ?? '',
        address: d['address'] ?? '',
        city: d['city'] ?? '',
        state: d['state'] ?? '',
        zipCode: d['zipCode'] ?? '',
        avatarUrl: d['avatarUrl'],
        accountStatus: d['accountStatus'] ?? 'active',
        createdAt: new Date(d['createdAt'] ?? Date.now()),
        updatedAt: new Date(d['updatedAt'] ?? Date.now()),
      };
    } catch {
      return null;
    }
  }

  private newProfile(
    uid: string,
    email: string,
    data: { firstName: string; lastName: string; phone: string; role: 'customer' | 'seller' },
  ): User {
    const now = new Date();
    return {
      id: uid,
      email,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: '',
      city: '',
      state: '',
      zipCode: '',
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };
  }

  private toFirestore(u: User) {
    return {
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      address: u.address,
      city: u.city,
      state: u.state,
      zipCode: u.zipCode,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  private setUser(profile: User, fbUser: FirebaseUser): void {
    this.currentUser.set(profile);
    this.verified.set(fbUser.emailVerified);
    this.providers.set(fbUser.providerData.map((p) => p.providerId));
    this.syncToMock(profile);
  }

  private clearUser(): void {
    this.cloud.stop();
    this.mockData.clearCloudData();
    this.currentUser.set(null);
    this.verified.set(false);
    this.providers.set([]);
  }

  /** TEMPORARY: other pages still read users from the mock store. Remove when users move fully to Firestore. */
  private syncToMock(profile: User): void {
    const copy = { ...profile };
    if (this.mockData.getUser(profile.id)) this.mockData.updateUser(copy);
    else this.mockData.addUser(copy);
  }

  private friendlyError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        // [GOOGLE-LOGIN] Google accounts have no GymPlate password until they create one
        return 'Incorrect email or password. If you signed up with Google, use "Continue with Google". You can create a password for your account in Profile after signing in with Google.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. If you signed up with Google, use "Continue with Google" instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Google sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled yet.';
      case 'auth/requires-recent-login':
        return 'For your security, please sign in again and retry.';
      case 'auth/credential-already-in-use':
      case 'auth/provider-already-linked':
        return 'This account already has a password. Use "Forgot password" if you need to reset it.';
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
