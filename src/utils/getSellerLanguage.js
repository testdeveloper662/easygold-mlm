const db = require("../models");

/**
 * Get seller's language from 6LWUP_usermeta table
 * @param {number} userId - The user_id of the seller
 * @returns {Promise<string>} - Returns "en" or "de" (normalized)
 */
async function getSellerLanguage(userId) {
  try {
    console.log(`🌐 Fetching language for user_id: ${userId} from 6LWUP_usermeta...`);

    // Query the usermeta table for the language meta_key
    const result = await db.sequelize.query(
      `
      SELECT meta_value 
      FROM 6LWUP_usermeta 
      WHERE user_id = :userId AND meta_key = 'language'
      LIMIT 1
      `,
      {
        replacements: { userId },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    // Check if language meta exists
    if (!result || result.length === 0) {
      console.log(`⚠️ No language meta found for user_id: ${userId}, defaulting to "en"`);
      return "en";
    }

    const metaValue = result[0].meta_value;
    console.log(`📝 Found language meta_value: "${metaValue}" for user_id: ${userId}`);

    // Normalize the language value
    // Handle cases like: "de", "de-DE", "de-CH", "en", "en-US", "en-GB"
    const normalizedValue = metaValue.toLowerCase().trim();

    if (normalizedValue.startsWith("de")) {
      console.log(`✅ Normalized language: "de" (from "${metaValue}")`);
      return "de";
    }

    // Default to English for any other value
    console.log(`✅ Normalized language: "en" (from "${metaValue}")`);
    return "en";
  } catch (error) {
    console.error(`❌ Error fetching seller language for user_id ${userId}:`, error);
    console.error("Stack trace:", error.stack);
    // Default to English on error
    return "en";
  }
}

module.exports = { getSellerLanguage };

