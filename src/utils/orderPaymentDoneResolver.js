// Landing page / My Store / API orders: whether the seller's commission row is
// auto-confirmed (is_payment_done) depends on EU vs non-EU (per s_country lookup)
// plus the order's own payment method + option. Parent-broker (non-seller) rows,
// and every non-EU seller row, always wait for admin confirmation (false).
//
// vat_id override (added on top of the above, only affects the EU case):
// - EU + vat_id present on the order's shipping options -> false, even where the
//   method/option table below would otherwise mark it true.
// - EU + vat_id absent -> unchanged, falls through to the method/option table.
// - non-EU -> always false regardless of vat_id (unchanged).
//
// Shared by src/controller/user/captureOrder.js (new orders) and
// src/migration/backfill_is_payment_done.js (existing orders), so both stay in sync.
const resolveOrderPaymentDone = (paymentMethod, paymentOption, isSeller, isEU, hasVatId) => {
  if (!isSeller) return false;
  if (!isEU) return false;
  if (hasVatId) return false;

  const method = Number(paymentMethod);
  const option = Number(paymentOption);

  if (method === 1 && [1, 2, 3, 4].includes(option)) return true;
  if (method === 2 && [1, 2, 3, 4].includes(option)) return false;
  if (method === 3 && [1, 2, 3, 4].includes(option)) return true;
  if (method === 4 && [1, 2, 3, 4].includes(option)) return true;
  if (method === 5 && option === 2) return true;
  if (method === 5 && option === 4) return false;

  return false;
};

module.exports = { resolveOrderPaymentDone };
