const db = require("../models");

async function up() {
  try {
    console.log("Updating PersonType table: setting row 2 to Business and inserting Affiliate...");
    
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
