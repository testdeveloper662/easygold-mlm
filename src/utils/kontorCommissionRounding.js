// QK-16: each level above the seller is floored to the cent, never rounded
// up — so a chain of independently-rounded levels can never sum to more
// than the base (that extra cent would otherwise be paid from nowhere).
// The seller (index 0) absorbs whatever's left, so the booked total always
// reconciles to the base exactly.
//
// Works symmetrically for a negative base (a reversal): flooring the
// magnitude (not the signed value) means a reversal never claws back more
// than it was given, same guarantee, opposite direction.
const floorMagnitudeToCents = (amount) => {
  const sign = amount < 0 ? -1 : 1;
  return (sign * Math.floor(Math.abs(amount) * 100 + 1e-9)) / 100;
};

// percentages[0] is always the seller's level. Pass sellerFixedAmount when
// the seller's row is fixed by business rule instead of being "whatever's
// left" — e.g. QK-18's structure_share, where the seller always gets 0 and
// a missing upper level's share is simply never booked (not redistributed).
const splitCommissionByPercent = (base, percentages, { sellerFixedAmount = null } = {}) => {
  const amounts = new Array(percentages.length).fill(0);
  let nonSellerSum = 0;

  for (let i = 1; i < percentages.length; i++) {
    const amount = floorMagnitudeToCents((percentages[i] / 100) * base);
    amounts[i] = amount;
    nonSellerSum += amount;
  }

  amounts[0] = sellerFixedAmount !== null ? sellerFixedAmount : Math.round((base - nonSellerSum) * 100) / 100;

  return amounts;
};

module.exports = { floorMagnitudeToCents, splitCommissionByPercent };
