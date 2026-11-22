# What Changed and Why (Learning Guide for Debugging)

This guide explains every change made to move GymPlate from demo login to real Firebase login.

---

## 1. The big picture

**Before:** the app pretended to log people in. Users, passwords and sessions lived in the browser (`localStorage`) through `mock-data.service.ts`.

**Now:**
- **Firebase Authentication** checks who the person is (email and password, or Google).
- **Firestore** (the database) stores each person's profile and role at `users/{uid}`.
- **Firestore Security Rules** (`firestore.rules`) decide who may read or write that data.
- **Angular guards** use the role to decide which pages a person can open.

```
Browser (Angular)  ->  Firebase Auth      "who are you?"          (login, register)
                   ->  Firestore users/   "what is your role?"    (customer / seller / admin)
                   ->  Security Rules     "are you allowed?"      (the real protection)
```

Important idea: **hiding a button or page in Angular is not security.** Anyone can change browser code. The real protection is the Firestore Security Rules on Google's servers.

Still on mock (browser) data: products, orders, reviews, seller applications, categories, admin user lists.

---

## 2. Concepts you need

### async / await / Promise
Asking Firebase to log in takes time (it talks to the internet). A function that takes time returns a **Promise** (a "result coming later").

```ts
// OLD (instant, fake)
const res = this.authService.login(email, password);   // res is the result

// NEW (takes time)
const res = await this.authService.login(email, password);  // wait for it
```

- `async` before a function means "this function can wait for things".
- `await` means "pause here until the result arrives".
- You can only use `await` inside an `async` function.

**Error you saw:** `Property 'success' does not exist on type 'Promise<AuthResult>'`.
That means the code used the answer without `await`. Fix: add `await` and make the function `async`.

### Signals (`signal`, `computed`)
Angular's way of holding a value that screens can watch.
```ts
private currentUser = signal<User | null>(null);        // holds the current user
readonly isLoggedIn = computed(() => !!this.currentUser()); // recalculates automatically
```
- Read a signal by calling it: `this.currentUser()`.
- Change it with `.set(value)`.

### Firebase Authentication vs Firestore
- **Authentication** knows: email, password, UID (unique id), verified or not. It does NOT know roles.
- **Firestore** `users/{uid}` knows: role, name, phone, accountStatus.
- The document ID in Firestore is the same as the UID from Authentication. That link is how the app finds a person's role.

### Guards
A guard runs before a page opens and answers "allowed?" (`true` or `false`). Ours check the role.

---

## 3. File by file

### NEW: `src/app/firebase.ts`
Connects the app to your Firebase project (`gymplate-618d2`).
- `firebaseConfig`: the project identifiers. These are **not secrets**.
- `firebaseAuth`: used for login functions.
- `firestore`: used for database reads and writes.

If you see "Firebase: No Firebase App" or wrong project errors, check this file.

### REPLACED: `src/app/services/auth.service.ts` (most important)
Everything about login lives here. Pages never talk to Firebase directly.

| Part | What it does |
|---|---|
| `currentUser`, `user`, `isLoggedIn`, `userRole`, `isCustomer/isSeller/isAdmin` | The logged-in person, available to every page |
| `ready` | A Promise that finishes after Firebase checks "is someone already logged in?" at app start |
| constructor + `onAuthStateChanged` | Runs whenever login status changes (refresh the page, log in, log out). Loads the profile from Firestore and sets `currentUser` |
| `login()` | Firebase email/password login, then `finishLogin()` |
| `adminLogin()` | Same login, then rejects anyone whose role is not `admin` |
| `loginWithGoogle()` | Opens Google popup. A new Google user gets a `customer` profile |
| `register()` | Creates the Firebase account, then creates the `users/{uid}` document, then sends a verification email |
| `logout()` | Signs out and clears the user |
| `resetPassword()` | Sends reset email. Always behaves the same, so nobody can find out which emails exist |
| `updateProfile()` | Saves only contact fields (name, phone, address...). Role and status cannot be changed here |
| `finishLogin()` | Loads the profile, blocks missing profiles and suspended accounts |
| `loadProfile()` | Reads `users/{uid}` from Firestore and turns it into a `User` |
| `newProfile()` / `toFirestore()` | Build the user object / convert it to a plain object for saving. Dates are saved as text (ISO strings) |
| `syncToMock()` | TEMPORARY. Copies the user into the old mock store so other pages that still read mock users keep working. Delete when users fully move to Firestore |
| `friendlyError()` | Turns Firebase error codes into readable messages |

Return type `AuthResult = { success, message, user? }`. Pages check `success`.

Security notes in this file:
- Passwords are never stored by us.
- Registration can only create `customer` or `seller`.
- Wrong email and wrong password give the same message ("Incorrect email or password").

### REPLACED: `src/app/guards/auth.guard.ts`
Guards are now `async` and start with `await authService.ready`.

Why: on page refresh, Firebase needs a moment to restore the login. Without waiting, the guard would think "not logged in" and kick the person out.

- `authGuard`: must be logged in
- `roleGuard([...roles])`: must be logged in AND have one of the roles
- `customerGuard`, `sellerGuard`, `adminGuard`: shortcuts
- `guestGuard`: for login/register pages. Redirects logged-in people to their dashboard

### CHANGED: `src/app/models/user.model.ts`
`passwordHash` changed from required to optional (`passwordHash?`). Real passwords are in Firebase now. The old demo seed users still have one, so the field stays optional.

### CHANGED pages (all now use `await`)

| File | Change |
|---|---|
| `pages/auth/login.component.ts` | `onSubmit()` is `async` and awaits `login()`. New `loginWithGoogle()`. New `afterLogin()` decides where to send each role. Demo box and demo Google flow removed |
| `pages/auth/register.component.ts` | `onSubmit()` awaits `register()` |
| `pages/auth/admin-login.component.ts` | `onSubmit()` awaits `adminLogin()`. Demo auto-fill removed |
| `pages/auth/seller-register.component.ts` | `submitApplication()` awaits `register()` with role `seller`, then creates the (still mock) application with the real Firebase UID. Demo "sign in as approved seller" removed. Prefilled demo password removed |
| `pages/auth/forgot-password.component.ts` | Now calls `authService.resetPassword()` (real email) |
| `pages/customer/customer-profile.component.ts` | `saveProfile()` awaits `updateProfile()` and shows an error if saving fails |
| `pages/public/landing.component.ts` | Quick demo switcher bar and `quickLogin()` removed |
| `shared/components/public-footer.component.ts` | "Demo Accounts" column removed |
| `angular.json` | Bundle size warning limit raised (Firebase adds size) |

### NEW: `firestore.rules`
The real security. Plain-language version:
- A signed-in user can read **their own** profile. Admins can read any profile.
- A user can create **only their own** profile, **only** as `customer` or `seller`, with status `active`, and the email must match their Firebase email. Nobody can create an `admin`.
- A user can update their own profile **but cannot change** `role`, `accountStatus`, `email` or `createdAt`. Admins can update any profile.
- Nobody can delete profiles.
- Everything else (products, orders...) is blocked until rules are written for it.

### NEW: `docs/FIREBASE-SETUP.md`
Steps for publishing rules and creating the admin account.

---

## 4. How the flows work

**Register:** form -> `register()` -> Firebase creates account -> app writes `users/{uid}` (role customer/seller) -> verification email sent -> user is logged in.

**Login:** form -> `login()` -> Firebase checks password -> `loadProfile()` reads role -> if missing or suspended, sign out and show a message -> else set `currentUser` -> page navigates by role.

**Refresh the page:** `onAuthStateChanged` runs -> Firebase restores the session -> profile loaded -> `ready` resolves -> guards decide.

**Opening `/admin`:** `adminGuard` -> waits for `ready` -> checks `userRole() === 'admin'` -> allow or redirect to `/`.

---

## 5. Debugging cheat sheet

**Where to look**
1. **Browser console** (F12 > Console): red errors with a code like `auth/...` or `permission-denied`.
2. **Firebase Console > Authentication > Users:** did the account get created?
3. **Firebase Console > Firestore > Data:** does `users/{uid}` exist with the right fields?
4. **Firestore > Rules tab:** are the rules published? (Use the Rules Playground to test.)
5. **VS Code Problems panel** (Ctrl+Shift+M): compile errors.

| Symptom / error | Likely cause | Fix |
|---|---|---|
| `Property 'x' does not exist on type 'Promise<...>'` | Missing `await` | Add `await`, make the function `async` |
| `Missing or insufficient permissions` | Rules not published, or the data breaks a rule (for example a field not in the allowed list) | Publish `firestore.rules`; compare the saved fields with the rule |
| Register creates the Auth user but shows an error | Profile write was denied by the rules | Check the rules and the exact fields sent by `toFirestore()` |
| "Account profile not found" at login | User exists in Authentication but has no `users/{uid}` document | Create the document (ID = the UID). This is common for the admin |
| Admin login says "for administrators only" | `role` in Firestore is not exactly `admin`, or the document ID is not that user's UID | Fix the document |
| `auth/invalid-credential` | Wrong email or password | Check the Authentication > Users list |
| `auth/operation-not-allowed` | Sign-in method not enabled | Enable Email/Password or Google |
| `auth/unauthorized-domain` | Domain not authorized | Authentication > Settings > Authorized domains (add `localhost`) |
| Google popup closes or is blocked | Browser popup blocker, or user cancelled | Allow popups for localhost |
| `auth/email-already-in-use` | Account exists | Log in instead |
| Logged-out after refresh | Guard not awaiting `ready` | Check `auth.guard.ts` has `await authService.ready` |
| New users do not appear in admin pages | Admin pages still read mock data | Expected for now; fixed when users move to Firestore |
| Seller registers but approval does nothing | Applications are still mock data | Expected for now |

**Tip:** to see what the app sees, temporarily add `console.log(profile)` inside `loadProfile()` or `console.log(res)` in `afterLogin()`. Remove it afterwards.

---

## 6. Things still to do
1. Move seller applications and approval to Firestore (with rules).
2. Move products to Firestore. Add the math check and reference-source fields.
3. Move orders to Firestore. Require verified email at checkout. Validate prices.
4. Move the audit/activity logs to Firestore.
5. Remove `syncToMock()` and the remaining mock user data.
6. Test security: try to read another user's data and try to make yourself admin. Both must fail.


---

# PHASE 2: Sellers in Firestore

## A. The problem this solves
Seller applications, approvals, businesses and the admin audit trail were fake browser data. Now they are real Firestore data, protected by rules.

## B. How it works (the "cache" idea)
The existing pages read data **instantly** from `MockDataService` (an in-memory store). Rewriting 40 pages to wait for Firestore would be risky, so:

1. **On login**, `CloudStoreService.startFor(user)` loads that person's data from Firestore **into** the in-memory store, and waits until it is loaded.
2. **While logged in**, Firestore listeners (`onSnapshot`) keep the store updated.
3. **Every change** is saved to Firestore first. If the Security Rules say no, the save returns `false` and the page shows an error.
4. **On logout**, the listeners stop and the store is cleared, so the next person never sees the previous person's data.

What each role loads:
| Role | Loads |
|---|---|
| Admin | all applications, all businesses, all activity logs, all users |
| Seller | only their own application and their own business |
| Customer | businesses (to show kitchen names) |

## C. New and changed files

| File | What changed |
|---|---|
| `services/cloud-store.service.ts` (new) | All Firestore reads/writes for sellers: `startFor`, `stop`, `saveApplication`, `approveApplication` (a batch: application and business are saved together or not at all), `saveBusiness`, `addActivityLog`, `setUserStatus`. Also `toPlain()` (Dates become text, undefined removed) and `fromPlain()` (text becomes Dates again) |
| `services/mock-data.service.ts` | New helper methods that **replace** the cache from Firestore without writing back (`replaceSellerApplications`, `replaceCloudBusinesses`, `replaceActivityLogs`, `upsertUsers`, `upsertBusiness`, `clearCloudData`). The demo seed applications and activity logs are removed |
| `services/seller.service.ts` | `submitApplication`, `approveApplication`, `rejectApplication`, `requestMoreInfo`, `updateBusiness` are now `async` and return `true/false` |
| `services/admin.service.ts` | `logActivity` also saves to Firestore. Suspend/reactivate also update `users/{uid}.accountStatus` |
| `services/auth.service.ts` | Calls `cloud.startFor()` after login/register and before the app is "ready"; clears data on logout. Added `authBusy` flag (see section E) |
| `pages/admin/admin-application-detail` | Approve/reject/request-info now `await` and show an alert if the save fails |
| `pages/auth/seller-register` | Waits for the application to be saved; shows an error if it fails |
| `pages/seller/seller-business` | Waits for the save and shows success or error |
| `firebase.ts` | `initializeFirestore(... ignoreUndefinedProperties: true)` so empty optional fields do not crash a save |
| `firestore.rules` | New rules for `sellerApplications`, `businesses`, `activityLogs` |

## D. The new rules in plain words
- **sellerApplications/{sellerUid}**: a seller can read only their own. A seller can create only their own, only with status `pending`, and only with the allowed fields (so they cannot sneak in `reviewedBy` or `status: approved`). Only an admin can update. Nobody can delete.
- **businesses/{sellerUid}**: any signed-in user can read. Only an admin creates one (at approval). A seller can edit their own details but not the owner, id, or `isActive`.
- **activityLogs/{id}**: admin read and create only; nobody can edit or delete (an audit trail must not be changeable).

## E. Two fixes you should understand

**1. Zoneless change detection.** This project has no `zone.js`, so Angular does not notice changes made after an `await` unless you tell it. Without a fix, a login error message or a spinner might not update on screen. The pages now inject `ChangeDetectorRef` and call `this.cdr.markForCheck()` after async work.
If you ever see "I changed a variable but the screen did not update" after an `await` or `setTimeout`, this is the reason.

**2. Registration race.** Creating a Firebase account triggers `onAuthStateChanged` immediately, **before** the profile document exists. The listener would find no profile and log the person out. The `authBusy` flag makes the listener wait while `register()` or Google login is still creating the profile.

## F. How the approval works, step by step
1. Seller registers: Firebase account, then `users/{uid}` (role `seller`), then `sellerApplications/{uid}` (status `pending`).
2. Admin logs in: `startFor(admin)` loads all applications. The queue shows the new one.
3. Admin clicks Approve: `approveApplication()` writes the application (status `approved`) **and** `businesses/{uid}` in one batch. Then `logActivity()` writes an audit entry.
4. The rules check that the writer is an admin. If a seller tries the same call from the browser console, the rules reject it.

## G. New debugging entries

| Symptom | Likely cause |
|---|---|
| Seller registers, "application could not be saved" | Updated rules not published, or the saved fields are not in the allowed list |
| Admin approve shows the "Could not save" alert | Not logged in as admin, rules not published, or admin profile `role` is not exactly `admin` |
| Admin sees no applications | Rules not published (check console for `permission-denied`), or the seller did not finish registering |
| New customers do not appear in the admin list | Refresh the admin page (the list loads on login and updates through listeners) |
| Console: `Firestore listener "x" failed: permission-denied` | The rules do not allow that role to read that collection |
| Old demo data still visible | Demo kitchens and demo users are kept until products and users move to Firestore |

## H. Still to do
1. Products to Firestore (with the calorie math check and reference-source fields).
2. Orders to Firestore with rules and server-side price checks.
3. Remove the demo users and demo kitchens.
4. Real file upload for seller documents (Firebase Storage).


---

# PHASE 2 FIXES (after first testing)

## 1. Overlapping loads (`startFor`)
At login, TWO things call `cloud.startFor()` almost at the same time: the auth listener and the login function. The old `startFor` began with `stop()`, so the second call cancelled the first call's listeners, and the first call then waited forever for data that never came.
Fix: `startFor` now remembers who it is loading for and reuses the load already in progress. `stop()` also releases anything still waiting.
**Lesson:** when two pieces of code can start the same job, make the job safe to start twice.

## 2. Screens did not refresh when Firestore data changed
Pages read the store once in `ngOnInit()`. If data arrived later (for example, a new application), the screen stayed old.
Fix: `CloudStoreService.version` is a signal that goes up each time Firestore data arrives. These pages use an `effect()` that re-runs `ngOnInit()` when it changes: admin applications, admin dashboard, admin sellers, admin customers, seller dashboard, seller pending.
```ts
private liveRefresh = effect(() => {
  this.cloud.version();                 // watch this signal
  untracked(() => this.ngOnInit());     // reload without creating extra watchers
});
```

## 3. Console messages for debugging
The browser console (F12) now prints lines like `[Firestore] sellerApplications: 1 document(s) loaded`.
- `0 document(s)` for an admin while Firestore has applications means the rules or the admin profile are wrong.
- A red `permission-denied` line means the rules rejected the read.
- No `[Firestore]` lines at all means the load never started.


---

# PHASE 2 FIXES (round 2): seller submit screen

## What went wrong
On the Review step, the first click created the Firebase account, but the screen never moved on. A second click tried to create the same account again and showed "An account with this email already exists."

## What changed
- **Success screen.** After the application is saved, the page shows "Application Submitted!" with 3 next steps (admin reviews, you can sign in to check status, you can publish once approved). It is controlled by the `submitted` flag in `seller-register.component.ts`.
- **Retry-safe submit.** If the email already exists (a previous try stopped halfway), the page signs in with the same email and password and continues instead of failing. If the application is already saved, it just shows the success screen.
- **`AuthResult.code`.** `register()` now returns the Firebase error code (for example `auth/email-already-in-use`), so pages can react to specific errors instead of comparing message text.
- **`register()` starts the Firestore listeners** (`cloud.startFor(profile)`). This line was missing before.
- **8-second limit** on the first Firestore load, so a slow or offline connection can never freeze login or registration.
- `try / catch / finally` around the whole submit, so the spinner always stops and the screen always refreshes (`markForCheck`).

## Lesson
When a multi-step action can stop halfway (account created, application not saved), design the action so pressing the button again finishes the job.
