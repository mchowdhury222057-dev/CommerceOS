# QA Checklist — Store Dashboard & Storefront (CMOS-14)

## Store Dashboard

### Dashboard
- [ ] KPI cards show real numbers for THIS store only
- [ ] Sales trend chart renders with real data, not empty/broken
- [ ] Recent Orders list shows real orders with correct risk badges

### Products
- [ ] Add Product form works — creates a real product with variants
- [ ] Edit Product works and saves changes correctly
- [ ] Deactivate/remove works, and the product disappears from the
      public storefront but still shows (as inactive) here
- [ ] Stock updates correctly per variant
- [ ] Image upload works, thumbnails display correctly

### Orders
- [ ] Order list shows real orders
- [ ] Clicking into an order shows full detail (customer, items, total)
- [ ] Status can be updated through the correct workflow (Pending →
      Confirmed → Processing → Shipped → Delivered)
- [ ] codConfirmedByCall checkbox works
- [ ] Courier tracking fields save correctly

### Customers
- [ ] Customer list shows real customers with order counts
- [ ] Risk badge appears correctly: test by marking 2+ orders from the
      SAME phone number as Returned, then placing a new order and
      confirming the Caution/High Risk badge shows up
- [ ] No badge shown for customers with no risk history (confirm the
      absence is correct, not a bug)

### Settings
- [ ] Store info displays correctly
- [ ] Editable fields (contact info, delivery notes) save correctly
- [ ] Staff invite (if built) works

### Profile
- [ ] Password change works
- [ ] Forgot password flow works end-to-end (request → dev-mode link
      shown → reset → login with new password succeeds, old password
      fails)

## Storefront (customer-facing)

- [ ] Homepage loads and shows real, active products only
- [ ] Deactivated products do NOT appear
- [ ] Product detail page: variant selector updates price correctly if
      a price override exists
- [ ] Out-of-stock variants are correctly disabled/marked
- [ ] Add to cart works, cart total is correct
- [ ] Checkout form validates required fields (phone format, etc.)
- [ ] Submitting checkout creates a real order — confirm it then shows
      up in the Store Dashboard's Orders page
- [ ] Order confirmation page shows correct info
- [ ] "Track my order" / order lookup by phone number works and only
      shows orders for the correct store + phone combination

## Cross-check

- [ ] Place a test order via the Storefront, then confirm it's visible
      in BOTH the Store Owner's Orders page AND (if built) the Master
      Admin's platform-wide order monitoring
