const db = require("../models");

async function up() {
  try {
    console.log("Updating PersonType table: setting row 2 to Business and inserting Affiliate...");

    // Idempotency guard: a row with value 'business' may already exist (e.g.
    // seeded directly, or this migration partially ran before on a DB where
    // id=2 wasn't 'company') — renaming another row to 'business' in that
    // case would violate the unique constraint on value, so skip entirely
    // once the end state is already reached.
    const businessRow = await db.PersonType.findOne({ where: { value: "business" } });

    if (!businessRow) {
      // 1. Update row 2 (company) to business
      await db.PersonType.update(
        {
          value: "business",
          label_en: "Business",
          label_de: "Unternehmen",
        },
        {
          where: { id: 2 },
        }
      );

      // Also handle case where row with value 'company' exists regardless of id
      await db.PersonType.update(
        {
          value: "business",
          label_en: "Business",
          label_de: "Unternehmen",
        },
        {
          where: { value: "company" },
        }
      );
    } else {
      console.log("PersonType 'business' already exists — skipping rename step.");
    }

    // 2. Ensure affiliate row exists
    const affiliateRow = await db.PersonType.findOne({
      where: { value: "affiliate" },
    });

    if (!affiliateRow) {
      await db.PersonType.create({
        value: "affiliate",
        label_en: "Affiliate",
        label_de: "Affiliate",
      });
      console.log("Created 'affiliate' in PersonType.");
    }

    // 3. Ensure private_individual row exists
    const privateRow = await db.PersonType.findOne({
      where: { value: "private_individual" },
    });

    if (!privateRow) {
      await db.PersonType.create({
        value: "private_individual",
        label_en: "Private Individual",
        label_de: "Privatperson",
      });
      console.log("Created 'private_individual' in PersonType.");
    }

    console.log("PersonType table successfully updated to Business, Affiliate, Private Individual.");
  } catch (err) {
    console.error("Error updating PersonType table:", err);
    throw err;
  }
}

module.exports = { up };
