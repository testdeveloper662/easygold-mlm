const db = require("../models");

/**
 * Email Template Helper Utility
 * Fetches email templates from database and replaces placeholders with actual values
 */

/**
 * Fetches email template from the existing 6lwup_email_view table by key
 * @param {number} templateKey - The template key (e.g., 84 for broker registration)
 * @returns {Promise<Object|null>} Template object or null if not found
 */
const getEmailTemplate = async (templateKey) => {
  try {
    const results = await db.sequelize.query(`SELECT * FROM \`6lwup_email_view\` WHERE \`id\` = :templateKey LIMIT 1`, {
      replacements: { templateKey },
      type: db.sequelize.QueryTypes.SELECT,
    });

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error(`[EmailTemplateHelper] Error fetching template ${templateKey}:`, error.message);
    throw error;
  }
};

/**
 * Applies placeholders in template string with actual values
 * Placeholders format: [variable_name] (square brackets)
 *
 * @param {string} template - Template string with placeholders
 * @param {Object} variables - Object with key-value pairs for replacement
 * @returns {string} Template with replaced values
 *
 * @example
 * applyPlaceholders("Hello [name]", { name: "John" }) // Returns "Hello John"
 * applyPlaceholders("Email: [email]", { email: "test@example.com" }) // Returns "Email: test@example.com"
 */
const applyPlaceholders = (template, variables = {}) => {
  if (!template || typeof template !== "string") {
    return template;
  }

  let result = template;

  // Replace all placeholders in format [variable_name] using square brackets
  Object.keys(variables).forEach((key) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const placeholder = new RegExp(`\\[${escapedKey}\\]`, "g");
    const value = variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : "";
    result = result.replace(placeholder, value);
  });

  return result;
};

/**
 * Replaces placeholders in template string with actual values (legacy format)
 * Placeholders format: {{variable_name}} (double curly braces)
 *
 * @param {string} template - Template string with placeholders
 * @param {Object} variables - Object with key-value pairs for replacement
 * @returns {string} Template with replaced values
 *
 * @example
 * replacePlaceholders("Hello {{name}}", { name: "John" }) // Returns "Hello John"
 */
const replacePlaceholders = (template, variables = {}) => {
  if (!template || typeof template !== "string") {
    return template;
  }

  let result = template;

  // Replace all placeholders in format {{variable_name}}
  Object.keys(variables).forEach((key) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const value = variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : "";
    result = result.replace(placeholder, value);
  });

  return result;
};

/**
 * Gets email template from 6lwup_email_view table and renders it with variables for a specific language
 *
 * @param {number} templateKey - Template key (e.g., 84)
 * @param {string} language - Language code ('en' or 'de')
 * @param {Object} variables - Variables to replace in template
 * @returns {Promise<Object>} Object with subject and htmlContent
 *
 * @example
 * const email = await getRenderedEmail(84, 'en', {
 *   brokerName: 'John Doe',
 *   email: 'john@example.com',
 *   tempPassword: 'temp123',
 *   referralCode: 'REF123',
 *   registerUrl: 'https://example.com/register?ref=REF123'
 * });
 */
const getRenderedEmail = async (templateKey, language = "en", variables = {}) => {
  try {
    const template = await getEmailTemplate(templateKey);

    if (!template) {
      throw new Error(`Template with key ${templateKey} not found in 6lwup_email_view table`);
    }

    // Select language-specific content
    const isGerman = language === "de" || language === "german";
    const selectedLanguage = isGerman ? "German" : "English";

    const subject = isGerman ? template.subject_german : template.subject_english;
    const content = isGerman ? template.content_german : template.content_english;

    if (!subject || !content) {
      throw new Error(`Template ${templateKey} missing ${selectedLanguage} content`);
    }

    // Apply placeholders using [variable] format
    const finalSubject = applyPlaceholders(subject, variables);
    const finalHtml = applyPlaceholders(content, variables);

    return {
      subject: finalSubject,
      htmlContent: finalHtml,
    };
  } catch (error) {
    console.error(`[EmailTemplateHelper] Error rendering email template ${templateKey}:`, error.message);
    throw error;
  }
};

/**
 * Fetches email template from 6lwup_email_view table using raw query
 * This is an alternative method using raw SQL
 *
 * @param {number} id - The id value (e.g., 84)
 * @returns {Promise<Object|null>} Template data or null
 */
const getLegacyEmailTemplate = async (id) => {
  try {
    const results = await db.sequelize.query(
      `
      SELECT 
        id,
        subject_english,
        subject_german,
        content_english,
        content_german
      FROM 6lwup_email_view
      WHERE id = :id
      LIMIT 1
      `,
      {
        replacements: { id },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error(`[EmailTemplateHelper] Error fetching template with id ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getEmailTemplate,
  applyPlaceholders,
  replacePlaceholders,
  getRenderedEmail,
  getLegacyEmailTemplate,
};
