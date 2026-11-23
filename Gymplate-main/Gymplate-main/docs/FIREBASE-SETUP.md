# Firebase Setup Guide

Project: `gymplate-618d2`

## 1. Publish the security rules (do this first, and again after every update of firestore.rules)
1. Firebase Console > Firestore Database > **Rules** tab.
2. Delete everything and paste the contents of `firestore.rules`.
3. Click **Publish**.

Without this step, registration will fail (production mode blocks everything).

## 2. Create the admin account
1. Authentication > Users > **Add user**. Enter the admin email and a strong password.
2. Copy the new user's **UID** from the table.
3. Firestore Database > **Start collection** > Collection ID: `users`.
4. Document ID: paste the **UID** (do not use Auto-ID).
5. Add these fields (all type **string**):

| Field | Value |
|---|---|
| email | the admin email |
| role | admin |
| firstName | Admin |
| lastName | GymPlate |
| phone | (empty) |
| address | (empty) |
| city | (empty) |
| state | (empty) |
| zipCode | (empty) |
| accountStatus | active |
| createdAt | 2026-11-12T00:00:00.000Z |
| updatedAt | 2026-11-12T00:00:00.000Z |

6. Save. Log in at `/auth/admin-login`.

Admins can only be created this way. The rules do not allow anyone to register as admin.

## 3. Google sign-in (optional)
Authentication > Sign-in method > Google > Enable > choose a support email > Save.
New Google users always become customers.

## 4. How the login works
- Passwords are handled only by Firebase Authentication.
- Each person has a profile at `users/{uid}` with a `role` (customer, seller, admin).
- The route guards read the role from that profile.
- Suspended accounts cannot log in.

## 5. Sellers in Firestore (phase 2)
New collections, created automatically by the app (you do not add them by hand):

| Collection | Document ID | Who writes it |
|---|---|---|
| `sellerApplications` | the seller's UID | the seller creates it (status `pending` only); only an admin can change it |
| `businesses` | the seller's UID | created by the admin when approving; the seller can edit their own details |
| `activityLogs` | auto id | admin only, append-only (cannot be edited or deleted) |

Test the seller flow:
1. Register a seller at `/auth/seller-register` (use a real, new email). Check Firestore: `users/{uid}` with role `seller`, and `sellerApplications/{uid}` with status `pending`.
2. Log in as admin. The application appears in Seller Applications. Open it and approve.
3. Check Firestore: the application now has status `approved`, `businesses/{uid}` exists, and `activityLogs` has a new entry.
4. Log in as the seller. The dashboard shows the approved state.

After you update `firestore.rules`, publish it again (Rules tab > Publish).

## 6. What is still on mock (browser) data
Products, orders, reviews, categories, and the customer pages. The old demo kitchens and demo users are still in the browser so the demo products keep working. They are removed when products and users finish moving to Firestore.
Uploaded documents (government ID, permit) are still simulated: only the file name is saved. Real file upload needs Firebase Storage.
