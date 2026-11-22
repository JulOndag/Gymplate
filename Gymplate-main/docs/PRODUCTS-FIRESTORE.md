# Meals (products) in Firestore: what changed

Search the code for `[PRODUCTS-FS` to find every change.

## The rule of the module (option C)
- Only an APPROVED, active seller can add meals. Meals go live immediately.
- The admin can take any meal down (Disable) and put it back (Re-Enable).
- Customers and visitors see only meals that are not disabled.

## Data
`products/{productId}`: id, sellerId, businessId, name, description, category, price, imageUrl,
nutrition{servingSize, calories, protein, carbs, fat}, stock, isAvailable, isDisabled, disableReason, createdAt, updatedAt.
Photos are shrunk in the browser and stored as text (Firestore allows 1MB per document).

## Changes by file
| Tag | File | What |
|---|---|---|
| #1-#4 | `services/cloud-store.service.ts` | Listeners for `products` (admin: all, seller: own, customer: not disabled), `startPublic()`, `saveProduct()`, `deleteProduct()` |
| #5-#6 | `services/mock-data.service.ts` | Hardcoded demo meals removed; meals no longer saved in the browser; `replaceCloudProducts()` and `upsertProduct()` |
| #7 | `services/product.service.ts` | add / update / delete now save to Firestore first (return true/false) |
| #8 | `services/admin.service.ts` | Disable / enable a meal saves to Firestore |
| #9 | `firestore.rules` | `canSell()`, `validProduct()`, rules for `products` |
| #10 | `shared/utils/image.util.ts` (new) | Shrinks photos to fit in Firestore |
| #11 | seven screens | Refresh when Firestore data changes (customer explore/home/detail, public explore, admin products, seller products/inventory) |
| #12 | `pages/public/explore.component.ts` | Visitors who are not logged in load the live menu |
| #13 | `pages/customer/customer-explore.component.ts` | No more hardcoded "FitFuel Kitchen" fallback |
| #14 | `pages/admin/admin-products.component.ts` | Disable / re-enable wait for Firestore |
| #15-#16 | seller products + inventory | Toggle, delete and stock changes save to Firestore |
| #17-#18 | add / edit product pages | Save to Firestore, shrink the photo, show errors |

## Test
1. Publish `firestore.rules`.
2. Log in as an APPROVED seller: Add Meal. Check `products` in the Firebase console.
3. Log in as a customer (another browser): the meal appears in Explore.
4. Log in as admin: Products > Disable (give a reason). The customer no longer sees it.
5. Log in as a PENDING seller: Add Meal is blocked in the screen AND by the rules.
6. Debug: browser console (F12). Look for `saveProduct failed` or `Firestore listener "products" failed`.

## Still on mock data (not in Firestore yet)
Orders (so stock is not reduced in Firestore when a customer orders), reviews and ratings, categories, notifications.


## Sample meals ([SAMPLE-FS])
Approved sellers get two buttons on `My Fitness Meals & Dishes`:
- **Import 10 demo meals**: the original demo meals of the project, with their photos.
- **Import 14 extra meals**: extra sample meals. Macros are estimates ("sample data"), photos are placeholders; replace them from Edit Meal.
They are saved as the seller's own meals in Firestore through the normal save (rules still apply). Clicking again skips meals already imported.
Files: `src/app/data/sample-meals.ts`, `ProductService.importSampleMeals()`, `makePlaceholderImage()` in `shared/utils/image.util.ts`.
