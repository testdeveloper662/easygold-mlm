const parseNotes = (notes) => {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
};

const formatTransaction = (row, broker) => {
  const noteData = parseNotes(row.notes);
  const commission = noteData.commission || {};

  return {
    reference: `MLM-TX-${String(row.id).padStart(6, "0")}`,
    entry_id: row.kontor_entry_id || noteData.entry_id || null,
    idempotency_key: row.kontor_idempotency_key,
    broker_id: broker?.id || null,
    external_ref: broker?.external_ref || null,
    orderType: noteData.orderType || row.order_type,
    event: noteData.event || null,
    order: noteData.order || null,
    product: noteData.product || null,
    amounts: noteData.amounts || null,
    basis_net_amount: commission.basis_net_cents !== undefined ? commission.basis_net_cents / 100 : null,
    is_seller: row.is_seller,
    commission_percent: row.commission_percent,
    commission_amount: row.commission_amount,
    corrects_entry_id: noteData.corrects_entry_id || null,
    corrects_reference: noteData.corrects_reference || null,
    is_reversal: row.commission_amount < 0 || Boolean(noteData.corrects_entry_id),
    is_payment_done: row.is_payment_done,
    acknowledged_at: row.kontor_acknowledged_at,
    occurred_at: row.occurred_at,
    created_at: row.createdAt,
  };
};

module.exports = { formatTransaction, parseNotes };
