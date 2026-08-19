## Sasify Reseller Flow — Plan & Architecture

### Current System State
- **Wallets:** Users top-up via deposits → admin approves → balance credited in USD.
- **Products:** Two types:
  1. **Own inventory** (`Product` + `InventoryItem`) — manual stock, `fulfillPaidOrder()` picks from inventory.
  2. **3rd-party products** (`ThirdPartyProduct`) — synced from Technysoft/Canboso/Akunding with admin-set selling price.
- **Order flow (existing):**
  - `order.create`: Wallet deduction → `fulfillPaidOrder()` → picks inventory item → delivers credentials.
  - `thirdParty.buy`: Wallet deduction → REAL provider purchase via API → delivers codes.

### Problem
`thirdParty.buy` currently makes a REAL purchase call to providers. Muneeb wants:
- User pays Muneeb's selling price (e.g., $500 for a $100 provider product).
- Provider purchase should be **smoke-tested only** (not real). 
- Muneeb manually fulfills from his provider wallet later.
- The flow must track: user paid $500 → provider cost was $100 → Muneeb's profit margin visible.

### Target Flow
```
User deposits → wallet balance
User clicks Buy on 3rd-party product ($500 selling price)
  → Wallet deducts $500 (not $100)
  → SMOKE TEST provider call (verify stock only, skip real purchase)
  → Order record created with: sellingPrice=$500, providerCost=$100, profitMargin=$400
  → Status: "pending_fulfillment" (manual)
  → Admin sees unfulfilled orders in admin panel
Admin manually buys from provider (outside the system)
  → Admin clicks "Fulfill" in admin panel
  → Delivery record created
  → User sees codes/credentials in dashboard
```

### Implementation Plan

#### 1. Add `SMOKE_TEST_MODE` env flag
- `api/routers/third-party.ts` — check `process.env.SMOKE_TEST_MODE === "true"`
- When enabled: skip `purchaseExternal()`, only verify stock, simulate success.
- When disabled: real purchase (existing behavior).

#### 2. Update `ThirdPartyOrder` schema fields
Add to model (MongoDB `ThirdPartyOrder`):
- `sellingPriceUsd: string` — what user paid (Muneeb's price)
- `providerCostUsd: string` — what provider charges
- `profitMarginUsd: string` — selling - cost
- `fulfillmentStatus: "pending" | "fulfilled"` — admin tracks manual fulfillment

#### 3. Admin panel — Fulfillment view
- New section in admin: "Pending Fulfillment" list
- Shows: product name, user, selling price, provider cost, profit
- "Mark Fulfilled" button → creates DeliveryRecord + Notification

#### 4. User dashboard
- `thirdParty.myOrders` already lists orders with status
- Show delivery details when `fulfillmentStatus === "fulfilled"`

### Files to change
| File | Change |
|------|--------|
| `api/routers/third-party.ts` | Add SMOKE_TEST_MODE, separate wallet deduction from purchase, track margin |
| `api/mongo/models.ts` | Add `sellingPriceUsd`, `providerCostUsd`, `profitMarginUsd`, `fulfillmentStatus` to ThirdPartyOrder |
| `api/routers/admin.ts` | Add admin query for unfulfilled orders + fulfill mutation |
| `api/routers/provider-settings.ts` | (already done — API key management) |
| `src/pages/Admin.tsx` | Add "Pending Fulfillment" section |
| `src/pages/Dashboard.tsx` | Show delivery details for fulfilled 3rd-party orders |

### Verification
1. Admin syncs 3rd-party products (Technysoft etc.)
2. Admin sets selling price (e.g., $500 for a $100 product)
3. User deposits $500
4. User buys product → wallet deducted $500 → smoke test passes → order shows "pending_fulfillment"
5. Admin sees order in "Pending Fulfillment" with profit margin
6. Admin clicks "Fulfill" → delivery created → user sees codes
