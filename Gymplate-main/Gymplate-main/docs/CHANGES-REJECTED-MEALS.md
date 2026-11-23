# Rejected meals cannot be verified again until the seller fixes them

## Problem
In the admin "Meal Details & Nutrition Review" window, a meal with status **Rejected** still showed the
**Verify nutrition** button. The admin could flip a rejected meal to verified with one click, even though
the seller had changed nothing.

## Rule of the flow
rejected -> (seller changes the numbers or the reference link and saves) -> pending -> admin reviews again

## What changed (4 places)
1. `pages/admin/admin-products.component.ts` (template): for a rejected meal the note box and the Verify
   button are hidden and a hint is shown. Verify only shows when the status is pending. The Reject button
   lost its own `*ngIf` (the block around it already excludes "rejected"; keeping it caused TS2367).
2. `pages/admin/admin-products.component.ts` (class): `verifyNutrition()` returns at once if the meal is rejected.
3. `services/admin.service.ts`: `reviewNutrition()` refuses "verified" when the meal is rejected.
4. `firestore.rules`: new function `adminReviewIsValid(newD, oldD)`; the admin update rule now requires it.
   This is the real protection, because screens and app code can be bypassed from the browser.

## Layers (for the paper)
Screen (hide the button) -> App code (guards in the page and service) -> Firestore Rules (server-side check).

## How to test
1. Reject a meal. Open it: no Verify button, a hint is shown.
2. As the seller, edit the meal: change the reference link or a nutrition number, save. It becomes Pending.
3. As the admin, open it again: Verify and Reject are back.
