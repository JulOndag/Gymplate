# GymPlate: Nutrition-Based Food Ordering System for Fitness-Focused Individuals

## 1. About

GymPlate is a web app for ordering food with the **calories, protein, carbs, and fats** shown for every meal. Customers browse, filter, order, and track meals; sellers manage their menu and orders; an administrator approves sellers, reviews the nutrition claims, and monitors the system.

## 2. Current Status

> Based on a review of the project files. The project builds successfully. Not every screen has been clicked through by hand, so test the main flows before a demo.

**Done**

- **Public pages:** landing, explore, about
- **Auth:** login (email/password and Google), customer register, seller register (application with kitchen logo and documents), admin login, forgot password, verification email sent at sign-up
- **Customer:** home dashboard, explore (search, macro focus, category and calorie filters), meal details, cart, checkout (pickup or delivery, cash payment), orders and order details with a live progress tracker, estimated prep and rider time, rate food, report an issue, receipts, archive/restore orders, nutrition summary (today, 7 days, 30 days, all time), profile with profile photo
- **Seller:** dashboard, meals as photo cards (add, edit, pause, archive, restore), nutrition reference link and **preparation time range** on every meal, orders and order details (accept, move forward, archive), inventory, reports, customer reports, reviews, notifications, business profile with profile photo, settings, pending-approval page
- **Admin:** dashboard, seller applications (approve, reject, ask for more information), sellers, customers, meals moderation (nutrition review, disable, archive), orders and order details, reports, food reports, activity logs, settings with profile photo
- **One look across all three roles:** same green theme, logo, cards, buttons and badges. Seller and admin use a side menu and a shared top bar with notifications.
- **Real-time updates:** screens refresh when Firestore data changes (new order, approval, stock change) without a page reload.
- **Role-based route guards** (customer / seller / admin)
- **Archive instead of delete:** meals and orders are archived and can be restored. Each side (seller, admin, customer) has its own archive, so archiving never hides an order from the other side.
- **Prep time and rider time:** the seller sets a prep range on each meal (for example 20 to 30 minutes). The order uses the slowest meal. Sellers cannot type minutes by hand when accepting an order. Rider time is shown separately as an estimate for delivery orders.
- **Profile photos** for customers, sellers and admins. A seller without a photo shows the kitchen logo.
- **Data in Firestore:** users, seller applications, businesses, products, orders, notifications, reviews, reports, and admin activity logs.

**Not done**

- Meal categories are a fixed list inside the app. There is no admin page to manage them.
- `mock-data.service.ts` is still used as a local cache (localStorage) of the Firestore data and holds the fixed category list.
- Photos and documents (meal photos, logos, profile photos, application documents) are shrunk and saved inside Firestore documents. Firebase Storage is not used yet.
- No online payment. Orders are cash on pickup or cash on delivery.
- Rider time is an estimate from the kitchen's and the customer's city and province. There is no map, GPS, or real rider tracking.

## 3. Security Status

| Item | Status |
|---|---|
| Firebase Authentication | Done (email/password and Google). |
| Secure password handling | Done. Passwords are handled only by Firebase Authentication. |
| Role-based access control | Done. Roles are stored in Firestore. Users cannot change their own role, status or email. Every collection has rules in `firestore.rules`, and everything else is denied by default. |
| Seller verification | Done. Only approved, active sellers can add meals or process orders. Only admins can approve applications. |
| Server-side order checks | Partly done. Rules check that only an active customer places their own order as "pending", that totals add up, that sellers can only move an order forward, and that only the customer or an admin can cancel. Stock is reduced in a transaction when the order is saved. Not done yet: comparing item prices with the meal's real price. |
| Meal data checks | Done in the rules (price and stock limits, photo size, prep time between 5 and 120 minutes). |
| Required reference source for nutrition | Done. A seller must add a link. The admin marks the numbers Verified or Rejected, and editing the numbers sends the meal back to Pending. |
| Ingredients on meals | Partly done. Ingredients are written in the description. There is no separate required field. |
| Nutrition math check (calories vs macros) | Not done. |
| Audit / activity logs | Done for admin actions. They are saved to Firestore and are append-only (cannot be edited or deleted). |
| No permanent deletes of orders | Done. Orders cannot be deleted by anyone. The app archives meals instead of deleting them. |
| Verified email before checkout | Not done. A verification email is sent at sign-up, but checkout does not require it yet. |
| Fake / spam control | Not done. |
| HTTPS, encryption at rest, backups | HTTPS and encryption come with Firebase Hosting and Firestore once deployed. Hosting is configured in `firebase.json`. Scheduled backups are not set up. |
| Demo login buttons and listed demo credentials | Removed. |
| Secrets | `firebase.config.ts` is git-ignored. Access control relies on Firebase Auth and `firestore.rules`, not on hiding the config. |

## 4. Tech Stack

Angular 22 (standalone components, lazy-loaded routes, signals), TypeScript, and Firebase (Authentication, Firestore with Security Rules and transactions, Hosting configuration).

## 5. Project Structure

```
src/app/
├── guards/        auth.guard.ts (customerGuard, sellerGuard, adminGuard, guestGuard)
├── models/        user, product (nutrition, prep time), order, review, report, notification
├── services/      auth, product, cart, order, seller, admin, report, notification,
│                  cloud-store (Firestore sync), mock-data (local cache)
├── shared/
│   ├── components/  navbars, sidebars, portal header, icons, footer, order progress,
│   │                profile photo, receipt / rate / report modals
│   └── utils/       image compression, dashboard helpers, prep and rider time
└── pages/
    ├── public/    landing, explore, about
    ├── auth/      login, registers, admin-login, forgot-password
    ├── customer/  home, explore, product-detail, cart, checkout, orders, nutrition, profile
    ├── seller/    dashboard, products, orders, inventory, reports, reviews, business, settings...
    └── admin/     dashboard, applications, sellers, customers, products, orders, reports, logs...

firestore.rules    Firestore Security Rules
docs/              setup and change notes
```

## 6. How to Run

```bash
cd <your-project-folder>
npm install
npm start
```

Open http://localhost:4200/

Before it works, finish the Firebase setup below. To create the first admin account, follow `docs/FIREBASE-SETUP.md`.

## 7. Next Steps

1. Block deleting meals in `firestore.rules`. The app only archives them now, but the rules still allow deletes.
2. Check item prices against the real meal price on the server (Firebase Cloud Function or a rules lookup).
3. Require a verified email before checkout.
4. Add the nutrition math check and a separate required ingredients field to the seller meal form.
5. Move categories to Firestore with an admin page, then retire the local cache in `mock-data.service.ts`.
6. Move photos and documents to Firebase Storage.
7. Use real distance (a maps service) for rider time.
8. Deploy on Firebase Hosting, set up backups, and test the rules with the Firebase Emulator or Rules Playground.

## 8. Limitations

Nutrition values are seller-provided estimates. The admin checks them against the reference link, but they are not professionally verified. Preparation and rider times are estimates. The daily nutrition summary only counts food ordered through GymPlate. The system gives no medical or dietary advice.

## Setup: Firebase config (required)

Real Firebase keys are not in this repository.

1. Copy `src/environments/firebase.config.example.ts` to `src/environments/firebase.config.ts`.
2. Fill in your own values from Firebase Console > Project settings > Your apps.
3. `npm install` then `npm start`.
4. Publish `firestore.rules` in Firebase Console > Firestore Database > Rules. Publish it again after every update of the file.

`firebase.config.ts` is git-ignored. Access control relies on Firebase Auth and `firestore.rules`.
