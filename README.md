# GymPlate: Nutrition-Based Food Ordering System for Fitness-Focused Individuals

## 1. About

GymPlate is a web app for ordering food with the **calories, protein, carbs, and fats** shown for every meal. Customers browse, filter, order, and track meals; sellers manage their menu and orders; an administrator approves sellers and monitors the system.

## 2. Current Status

> Based on a review of the project files. The project builds successfully (`ng build`). The app was read and built, but not clicked through screen by screen, and the security rules were read but not run in the Firebase emulator.

**Done (front end)**

- Public pages: landing, explore (live menu), about
- Auth pages: login, customer register, seller register (application), admin login, forgot password
- Customer: home, explore, product detail, cart, checkout, orders and order detail (live progress, cancel), nutrition summary, profile (with photo), rate meals, report food issues
- Seller: dashboard, products (add, edit, archive, import sample meals), orders and order detail, inventory, reports, customer reports, reviews, business profile, notifications, settings, pending-approval page
- Admin: dashboard, seller applications and review, sellers, customers, products (disable / re-enable), orders and order detail, reports, food reports, activity logs, settings
- Role-based route guards (customer / seller / admin)
- Live updates: screens and the notification bell refresh by themselves when Firestore data changes (new order, new status, new notification), with no page refresh
- Shared components: navbars, sidebars, top bar, receipt, order progress, rate-food and report-issue modals

**Done (Firebase)**

- Firebase Authentication (email and password; Google sign-in once enabled in the console)
- Firestore collections used by the app: `users`, `sellerApplications`, `businesses`, `products`, `orders`, `notifications`, `reviews`, `reports`, `activityLogs`
- Placing an order reduces the meal stock in one transaction; cancelling puts it back
- `firestore.rules` covers all of the collections above and denies everything else by default

**Not done**

- Still in the browser (localStorage), so not shared between users or devices: the shopping cart and the list of meal categories. Old demo seed data still exists in `mock-data.service.ts`, but it cannot be used to log in.
- No server code (no Cloud Functions). Everything runs in the browser, protected by the security rules.
- Seller documents (government ID, business permit) are simulated: only the file name is saved. Real upload needs Firebase Storage.
- Not deployed yet (Firebase Hosting).

## 3. Security Status (important for IT311)

| Item in proposal                                   | Status                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase Authentication                            | Done (email/password; Google sign-in once enabled in the console). A verification email is sent at sign-up.                                                                                                                                                                                                                                                                                                                                     |
| Secure password handling                           | Done. Passwords are handled only by Firebase Authentication.                                                                                                                                                                                                                                                                                                                                                                                    |
| Role-based access control                          | Done in `firestore.rules` for every collection the app uses. Roles are stored in Firestore and users cannot change their own role. Only admins can approve sellers, disable meals and decide food reports. Only approved sellers can add meals, and only to their own kitchen. Sellers see and change only their own meals and orders; customers see only their own orders. Everything else is denied. Not yet tested in the Firebase emulator. |
| Server-side order validation                       | Partly done. The rules check who can place an order, that it starts as `pending`, that the total equals subtotal plus fees, that sellers can only move an order forward (never cancel), and that customers can change only the stock fields of a meal. Item prices and quantities are still calculated in the browser; checking them against the real meal prices needs a Cloud Function.                                                       |
| Audit / activity logs                              | Partly done. Admin actions (suspend or reactivate an account, approve a seller, disable, enable, archive or restore a meal) are saved to Firestore and are append-only (cannot be edited or deleted). Seller and customer actions are not logged.                                                                                                                                                                                               |
| HTTPS, encryption at rest, backups                 | Not done. HTTPS and encryption come with Firebase Hosting and Firestore; backups still have to be set up.                                                                                                                                                                                                                                                                                                                                       |
| Nutrition math check (calories vs macros)          | Not done. The rules only check that the numbers are not negative. There is no calories-versus-macros check on the seller form or in the rules.                                                                                                                                                                                                                                                                                                  |
| Required reference source and ingredients on meals | Not done. Ingredients can only be typed into the free-text "Description & Ingredients" box. There is no reference source field.                                                                                                                                                                                                                                                                                                                 |
| Fake/spam control (verified email before checkout) | Partly done. The verification email is sent, but checkout and the rules do not require a verified email yet.                                                                                                                                                                                                                                                                                                                                    |
| Notifications                                      | Only the owner can read a notification or mark it as read. Any signed-in user can create one for another user (fixed fields only, always unread). This is needed so a customer can notify a seller, and should be tightened later.                                                                                                                                                                                                              |
| Demo login buttons and listed demo credentials     | Removed. The old demo seed accounts can no longer log in.                                                                                                                                                                                                                                                                                                                                                                                       |

## 4. Tech Stack

Angular 22 (standalone components, lazy-loaded routes), TypeScript, signals, Firebase 13 (Authentication, Firestore with Security Rules). Planned: Firebase Hosting.

## 5. Project Structure

```
firestore.rules              Firestore Security Rules (publish in the Firebase Console)
docs/                        FIREBASE-SETUP.md, PRODUCTS-FIRESTORE.md, CHANGES-EXPLAINED.md
src/environments/            firebase.config.example.ts (copy to firebase.config.ts)
src/app/
├── firebase.ts              starts Firebase (Authentication and Firestore)
├── guards/                  auth.guard.ts (customerGuard, sellerGuard, adminGuard, guestGuard)
├── models/                  user, product (with NutritionInfo), order, review, report, notification
├── data/                    sample-meals.ts (sample meals a seller can import)
├── services/                auth, cloud-store (Firestore listeners and saving), product, cart, order,
│                            seller, admin, report, notification,
│                            mock-data (in-memory copy of the data Firestore sends, plus categories and demo seed data)
├── shared/
│   ├── components/          navbars, sidebars, top bar, icon, footer, receipt, order progress,
│   │                        profile photo card, rate-food and report-issue modals
│   └── utils/               image (shrinks photos), live-refresh (auto-refresh screens), dashboard (trend lines)
└── pages/
    ├── public/    landing, explore, about
    ├── auth/      login, registers, admin-login, forgot-password
    ├── customer/  home, explore, product-detail, cart, checkout, orders, nutrition, profile
    ├── seller/    dashboard, products, orders, inventory, reports, reviews, business, notifications, settings...
    └── admin/     dashboard, applications, sellers, customers, products, orders, reports, food-reports, activity-logs, settings
```

## 6. How to Run

1. Do the Firebase setup below (config file, rules, admin account).
2. In the project folder:

```bash
npm install
npm start
```

Open http://localhost:4200/

## 7. Next Steps

1. Add the nutrition math check (calories vs macros) and the required reference source and ingredients fields to the seller product form and to `validProduct()` in the rules.
2. Require a verified email at checkout (in the screen and in the rules).
3. Validate order item prices against the real meal prices on the server (Firebase Cloud Function).
4. Test `firestore.rules` with the Firebase emulator (customer, seller, admin and logged-out cases).
5. Log seller actions (add, edit, archive meal) in the activity log, and tighten who can create notifications.
6. Move the meal categories (and, if needed, the cart) to Firestore, then remove the demo seed data from `mock-data.service.ts`.
7. Deploy on Firebase Hosting and test both functions and security.

## 8. Limitations

Nutrition values are seller-provided estimates and are not professionally verified. The daily nutrition summary only counts food ordered through GymPlate. The system gives no medical or dietary advice. Payment is cash on pickup or delivery only; there is no online payment.

## Setup: Firebase config (required)

Real Firebase keys are not in this repository.

1. Copy `src/environments/firebase.config.example.ts` to `src/environments/firebase.config.ts`.
2. Fill in your own values from Firebase Console > Project settings > Your apps.
3. Publish `firestore.rules` in Firebase Console > Firestore Database > Rules > Publish (again after every change to the file). Without this, registration and ordering fail.
4. Create the admin account by hand (admins cannot register in the app). Steps are in `docs/FIREBASE-SETUP.md`.
5. `npm install` then `npm start`.

`firebase.config.ts` is git-ignored. Access control relies on Firebase Auth and `firestore.rules`.
