# GymPlate: Nutrition-Based Food Ordering System for Fitness-Focused Individuals

## 1. About

GymPlate is a web app for ordering food with the **calories, protein, carbs, and fats** shown for every meal. Customers browse, filter, order, and track meals; sellers manage their menu and orders; an administrator approves sellers and monitors the system.

## 2. Current Status

> Based on a review of the project files. The project builds successfully. The app was read and built, but not clicked through screen by screen.

**Done (front end, using demo data)**
- Public pages: landing, explore, about
- Auth pages: login, customer register, seller register (application), admin login, forgot password
- Customer: home, explore, product detail, cart, checkout, orders and order detail, nutrition summary, profile
- Seller: dashboard, products (add/edit), orders and order detail, inventory, reports, customer reports, reviews, business profile, notifications, settings, pending-approval page
- Admin: dashboard, seller applications and review, sellers, customers, products, orders, categories, reports, food reports, activity logs, settings
- Role-based route guards (customer / seller / admin)
- Shared components: navbars, sidebars, receipt, rate-food and report-issue modals

**Not done**
- No back end. Data is stored in the browser (localStorage) through `mock-data.service.ts`, so nothing is shared between users or devices.
- Firebase Authentication, user profiles, **seller applications, seller approval, businesses and the admin activity log** are connected to Firestore. Products, orders, reviews and the customer pages are still in-browser mock data.

## 3. Security Status (important for IT311)

| Item in proposal | Status |
|---|---|
| Firebase Authentication | Done (email/password; Google sign-in once enabled in the console). |
| Secure password handling | Done. Passwords are handled only by Firebase Authentication. |
| Role-based access control | Partly done. Roles are stored in Firestore; users cannot change their own role; only admins can approve sellers (see `firestore.rules`). Rules for products and orders are still to be written. |
| Server-side order validation | Not done. Prices and totals are calculated in the browser. |
| Audit / activity logs | Done for admin actions: saved to Firestore, append-only (cannot be edited or deleted). Seller/product logs come with products. |
| HTTPS, encryption at rest, backups | Not done. They come with hosting (Firebase Hosting / Firestore). |
| Nutrition math check (calories vs macros) | Not found on the seller product form. |
| Required reference source and ingredients on meals | Not found. |
| Fake/spam control (verified login before checkout) | Not done (needs real authentication). |
| Demo login buttons and listed demo credentials | Removed. The old demo seed accounts can no longer log in. |

## 4. Tech Stack

Angular 22 (standalone components, lazy-loaded routes), TypeScript, signals. Planned: Firebase (Authentication, Firestore with Security Rules, Hosting).

## 5. Project Structure

```
src/app/
├── guards/        auth.guard.ts (customerGuard, sellerGuard, adminGuard, guestGuard)
├── models/        user, product (with NutritionInfo), order, review, report, notification
├── services/      auth, product, cart, order, seller, admin, report, notification,
│                  mock-data (temporary in-browser data store)
├── shared/components/   navbars, sidebars, icon, footer, receipt/rate/report modals
└── pages/
    ├── public/    landing, explore, about
    ├── auth/      login, registers, admin-login, forgot-password
    ├── customer/  home, explore, product-detail, cart, checkout, orders, nutrition, profile
    ├── seller/    dashboard, products, orders, inventory, reports, reviews, settings...
    └── admin/     dashboard, applications, sellers, customers, products, orders, reports, logs...
```

## 6. How to Run

```bash
cd GYMPLATE-main
npm install
npm start
```

Open http://localhost:4200/

## 7. Next Steps

1. Move products to Firestore (with the math check and reference source).
2. Move orders to Firestore, enforce verified email at checkout.
3. Move data from `mock-data.service.ts` to Firestore, one service at a time (products, then orders, then users).
4. Write Firestore Security Rules (customers: own orders only; sellers: own products and orders only; admin: management functions).
5. Add the nutrition math check and the required reference source and ingredients fields to the seller product form.
6. Validate order prices server-side (Firebase Cloud Function or rules).
7. Deploy on Firebase Hosting and test both functions and security.

## 8. Limitations

Nutrition values are seller-provided estimates and are not professionally verified. The daily nutrition summary only counts food ordered through GymPlate. The system gives no medical or dietary advice.


## Setup: Firebase config (required)

Real Firebase keys are not in this repository.

1. Copy `src/environments/firebase.config.example.ts` to `src/environments/firebase.config.ts`.
2. Fill in your own values from Firebase Console > Project settings > Your apps.
3. `npm install` then `npm start`.
4. Publish `firestore.rules` in Firebase Console > Firestore Database > Rules.

`firebase.config.ts` is git-ignored. Access control relies on Firebase Auth and `firestore.rules`.
