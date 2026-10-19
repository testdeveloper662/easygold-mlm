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
  const source = noteData.source || {};
  const commission = noteData.commission || {};

  return {
    reference_id: `KONTOR-CMM-${row.id}`,
    kontor_entry_id: row.kontor_entry_id || noteData.entry_id || null,
    idempotency_key: row.kontor_idempotency_key,
    seq: noteData.seq ?? null,
    mode: row.kontor_mode || null,
    source_type: source.type || null,
    order_number: source.order_number || null,
    line: source.line ?? null,
    document_number: source.document_number || null,
    channel: noteData.channel || null,
    direction: noteData.direction || null,
    product: noteData.product || null,
    quantity: noteData.quantity ?? null,
    amounts: noteData.amounts || null,
    basis_net_amount: commission.basis_net_cents !== undefined ? commission.basis_net_cents / 100 : null,
    order_type: row.order_type,
    mlm_customer_number: broker?.mlm_customer_number || null,
    customer_no: broker?.external_ref || null,
    is_seller: row.is_seller,
    commission_percent: row.commission_percent,
    commission_amount: row.commission_amount,
    event: noteData.event || null,
    entry_kind: noteData.entry_kind || null,
    corrects_entry_id: noteData.corrects_entry_id || null,
    is_reversal: row.commission_amount < 0 || Boolean(noteData.corrects_entry_id),
    is_payment_done: row.is_payment_done,
    acknowledged_at: row.kontor_acknowledged_at,
    occurred_at: row.occurred_at,
    created_at: row.createdAt,
  };
};

module.exports = { formatTransaction, parseNotes };
