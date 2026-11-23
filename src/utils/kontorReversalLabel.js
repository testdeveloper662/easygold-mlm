const db = require("../models");

const parseNotes = (notes) => {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
};

// Kontor sends an explicit type:"reversal" + event (e.g. "refunded") on a
// correction; a negative commission_amount is the fallback signal for any
// row that predates that convention.
const EVENT_LABELS = {
  refunded: "Refunded",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  corrected: "Corrected",
};

const getKontorStatus = (row, noteData) => {
  const isReversal =
    noteData.type === "reversal" ||
    Boolean(noteData.corrects_entry_id) ||
    Boolean(noteData.corrects_reference) ||
    Number(row?.commission_amount) < 0;

  if (!isReversal) return { is_reversal: false, status_label: null };

  const label = EVENT_LABELS[String(noteData.event || "").toLowerCase()] || "Reversed";
  return { is_reversal: true, status_label: label };
};

// A reversal's own notes carry no `order` object by default — captureOrderReverse.js
// now copies it forward from the original booking at write time, but older
// reversal rows won't have it, so fall back to looking up the original via
// whichever reference the reversal gave.
const resolveKontorOrderNumber = async (noteData) => {
  if (noteData?.order?.number) return noteData.order.number;
  if (!noteData?.corrects_entry_id && !noteData?.corrects_reference) return null;

  let original = null;
  if (noteData.corrects_entry_id) {
    original = await db.BrokerCommissionHistory.findOne({
      where: { kontor_entry_id: String(noteData.corrects_entry_id), is_seller: true },
      attributes: ["notes"],
    });
  }
  if (!original && noteData.corrects_reference) {
    const match = String(noteData.corrects_reference).match(/^MLM-TX-(\d+)$/);
    if (match) {
      original = await db.BrokerCommissionHistory.findOne({
        where: { id: parseInt(match[1], 10), is_seller: true },
        attributes: ["notes"],
      });
    }
  }
  if (!original) return null;
  return parseNotes(original.notes)?.order?.number || null;
};

module.exports = { parseNotes, getKontorStatus, resolveKontorOrderNumber };
