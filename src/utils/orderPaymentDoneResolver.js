// Landing page / My Store / API orders: whether the seller's commission row is
// auto-confirmed (is_payment_done) depends on EU vs non-EU (per s_country lookup)
// plus the order's own payment method + option. Parent-broker (non-seller) rows,
// and every non-EU seller row, always wait for admin confirmation (false).
//
// vat_id override (only affects the EU case, and only for cross-border EU sales):
// - EU, NOT Germany, + vat_id present -> false, even where the method/option
//   table below would otherwise mark it true (cross-border reverse charge;
//   Hartmann & Benz GmbH, the B2B_DASHBOARD supplying entity, is registered in
//   Germany, so any delivery outside Germany but still in the EU is cross-border).
// - Germany -> vat_id is ignored entirely, always falls through to the
//   method/option table. A German delivery is domestic regardless of vat_id,
//   so German VAT always applies and the broker stays the contractual partner.
// - EU + vat_id absent -> unchanged, falls through to the method/option table.
// - non-EU -> always false regardless of vat_id (unchanged).
//
// Business rule (EU + vat_id absent case):
// - Crypto (method 2), any option -> false. EasyGold Admin pays Levels 1-5.
// - choose_payment_option 4, ANY payment method -> false. Same as above: Admin
//   pays Levels 1-5, not just the seller's own Level 1.
// - Bank/Cash/Card (methods 1, 3, 4) with option 1, 2, or 3 -> true. The broker
//   already collected Level 1 directly from the customer; Admin only pays
//   Levels 2-5 for these.
// - FLIZPay (method 5) with option 2 -> true (unchanged, unaddressed by the
//   Option 1/2/4 rule above since it's method-specific, not option-specific).
//
// Shared by src/controller/user/captureOrder.js (new orders) and
// src/migration/backfill_is_payment_done.js (existing orders), so both stay in sync.
const resolveOrderPaymentDone = (paymentMethod, paymentOption, isSeller, isEU, hasVatId, isGermany) => {
  if (!isSeller) return false;
  if (!isEU) return false;
  if (hasVatId && !isGermany) return false;

  const method = Number(paymentMethod);
  const option = Number(paymentOption);

  if (method === 2) return false;
  if (option === 4) return false;

  if (method === 1 && [1, 2, 3].includes(option)) return true;
  if (method === 3 && [1, 2, 3].includes(option)) return true;
  if (method === 4 && [1, 2, 3].includes(option)) return true;
  if (method === 5 && option === 2) return true;

  return false;
};

module.exports = { resolveOrderPaymentDone };
