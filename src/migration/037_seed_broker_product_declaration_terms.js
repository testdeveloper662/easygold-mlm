const db = require("../models");

// Reserved document_key the broker-side product referral links use to look up
// this declaration. The admin UI keeps this key (and the English/German name)
// locked once seeded so the broker-side lookup never breaks; only the body
// text and the PDF uploads stay editable from the admin panel.
const DOCUMENT_KEY = "broker_product_declaration";

const ENGLISH_NAME = "Broker/Dealer Product Declaration (used for EasyGold / PrimeInvest / Goldflex referral link approval)";
const GERMAN_NAME = "Haendler-/Broker-Produkterklaerung (fuer die Freigabe der EasyGold-/PrimeInvest-/Goldflex-Empfehlungslinks)";

const ENGLISH_TEMPLATE_TEXT = `
<h2>Distribution Policy</h2>
<p><strong>Version 1.0 | 18 November 2026</strong></p>
<h3>Binding Dealer and Broker Declaration</h3>
<p>Advertising and distribution restrictions for EasyGold Tokens, shares and investment products</p>
<p><em>Draft - subject to legal review before use</em></p>

<h4>&sect; 1 Providers and Scope</h4>
<p>This declaration applies to all dealers, brokers, intermediaries and other distribution partners who advertise, arrange or distribute products relating to EasyGold Tokens, shares, equity interests or other investment products of the following companies:</p>
<ul>
  <li>Hartmann &amp; Benz LLC</li>
  <li>Hartmann &amp; Benz Inc.</li>
  <li>Hartmann &amp; Benz Limited</li>
</ul>
<p>The company identified in the specific product offer shall be the responsible contractual counterparty. Naming these companies in this declaration does not, by itself, make them joint contractual counterparties.</p>

<h4>&sect; 2 Exclusion of the European Union (EU)</h4>
<p>According to the providers, no EU securities prospectus approved and published for a public offer within the European Union is currently available for the products covered by this declaration. Regardless of any statutory exemptions that may apply, the following binding contractual distribution restriction applies: public advertising, marketing, intermediation or public offers directed at persons within the EU are prohibited.</p>
<p>This prohibition applies in particular to:</p>
<ul>
  <li>Advertising via websites, online stores and landing pages.</li>
  <li>Advertising on social media platforms, including Facebook, Instagram, TikTok, YouTube and LinkedIn.</li>
  <li>Paid advertisements, email marketing and digital advertising campaigns.</li>
  <li>Publishing or deliberately sharing product links, QR codes and promotional materials for the purpose of targeting customers within the EU.</li>
  <li>Direct solicitation, investment intermediation or targeted sales promotion to persons resident or established within the EU.</li>
</ul>
<p>The prohibition also covers advertising via websites or communication channels operated outside the EU where the advertising is specifically targeted at persons within the EU.</p>

<h4>&sect; 3 Distribution Outside the European Union</h4>
<p>Advertising, arranging or distributing the products outside the European Union is permitted only in countries where all legal and regulatory requirements applicable to the relevant product and activity are fulfilled.</p>
<p>Before commencing any activity, the dealer or broker must verify whether the necessary authorizations, registrations, disclosures and other requirements are in place. The mere fact that a product link is accessible worldwide does not constitute permission to distribute the product worldwide.</p>

<h4>&sect; 4 Obligations of the Dealer or Broker</h4>
<p>The dealer or broker expressly undertakes to:</p>
<ul>
  <li>comply with all applicable advertising and distribution restrictions;</li>
  <li>refrain from advertising or arranging products in a manner targeted at persons in the EU;</li>
  <li>refrain from making impermissible return promises, profit guarantees or misleading statements;</li>
  <li>use product links and promotional materials only where legally permitted;</li>
  <li>refrain from circumventing these restrictions directly, through third parties or by technical means.</li>
</ul>
<p>In the event of a breach, the relevant companies may, in accordance with their contractual arrangements, suspend permission to use product links and access to distribution functions. Any further rights and claims are governed by applicable law and the relevant contracts.</p>

<h4>&sect; 5 Binding Electronic Confirmation</h4>
<p>By actively confirming electronically, the dealer or broker declares that they have read and understood the provisions above and undertake to comply with them.</p>
<p>Confirmation is a prerequisite for enabling the "Copy Product Link" function. For evidentiary purposes, the confirmation, a unique user identifier, date and time, and the version of the declaration accepted will be recorded in the system.</p>
<p>The confirmation does not replace any regulatory authorization or other statutory requirement that may apply.</p>

<h4>Dashboard Confirmation</h4>
<p>I expressly confirm that I have read and understood the advertising and distribution restrictions above. I understand that I must not advertise or arrange the listed EasyGold Tokens, shares and investment products to persons within the European Union. I undertake to advertise or arrange these products only in countries and in a manner in which doing so is legally permitted.</p>
`;

const GERMAN_TEMPLATE_TEXT = `
<h2>Vertriebsrichtlinie</h2>
<p><strong>Version 1.0 | 18. November 2026</strong></p>
<h3>Verbindliche Haendler- und Broker-Erklaerung</h3>
<p>Werbe- und Vertriebsbeschraenkungen fuer EasyGold-Token, Anteile und Anlageprodukte</p>
<p><em>Entwurf - vor Verwendung rechtlich zu pruefen</em></p>

<h4>&sect; 1 Anbieter und Anwendungsbereich</h4>
<p>Diese Erklaerung gilt fuer alle Haendler, Broker, Vermittler und sonstigen Vertriebspartner, die Produkte im Zusammenhang mit EasyGold-Token, Anteilen, Beteiligungen oder anderen Anlageprodukten der folgenden Unternehmen bewerben, vermitteln oder vertreiben:</p>
<ul>
  <li>Hartmann &amp; Benz LLC</li>
  <li>Hartmann &amp; Benz Inc.</li>
  <li>Hartmann &amp; Benz Limited</li>
</ul>
<p>Vertragspartner ist jeweils das im konkreten Produktangebot genannte Unternehmen. Die Nennung dieser Unternehmen in dieser Erklaerung macht sie nicht automatisch zu gemeinsamen Vertragspartnern.</p>

<h4>&sect; 2 Ausschluss der Europaeischen Union (EU)</h4>
<p>Nach Angaben der Anbieter liegt fuer die von dieser Erklaerung erfassten Produkte derzeit kein von einer Behoerde gebilligter und innerhalb der Europaeischen Union veroeffentlichter EU-Wertpapierprospekt fuer ein oeffentliches Angebot vor. Unabhaengig von etwaigen gesetzlichen Ausnahmen gilt die folgende verbindliche vertragliche Vertriebsbeschraenkung: oeffentliche Werbung, Vermarktung, Vermittlung oder oeffentliche Angebote, die sich an Personen innerhalb der EU richten, sind untersagt.</p>
<p>Dieses Verbot gilt insbesondere fuer:</p>
<ul>
  <li>Werbung ueber Websites, Onlineshops und Landingpages.</li>
  <li>Werbung auf Social-Media-Plattformen, einschliesslich Facebook, Instagram, TikTok, YouTube und LinkedIn.</li>
  <li>Bezahlte Anzeigen, E-Mail-Marketing und digitale Werbekampagnen.</li>
  <li>Das Veroeffentlichen oder gezielte Teilen von Produktlinks, QR-Codes und Werbematerialien mit dem Ziel, Kunden innerhalb der EU anzusprechen.</li>
  <li>Direkte Ansprache, Anlagevermittlung oder gezielte Verkaufsfoerderung gegenueber Personen mit Wohnsitz oder Sitz innerhalb der EU.</li>
</ul>
<p>Das Verbot umfasst auch Werbung ueber Websites oder Kommunikationskanaele ausserhalb der EU, wenn sich die Werbung gezielt an Personen innerhalb der EU richtet.</p>

<h4>&sect; 3 Vertrieb ausserhalb der Europaeischen Union</h4>
<p>Die Bewerbung, Vermittlung oder der Vertrieb der Produkte ausserhalb der Europaeischen Union ist nur in Laendern zulaessig, in denen alle fuer das jeweilige Produkt und die jeweilige Taetigkeit geltenden rechtlichen und regulatorischen Anforderungen erfuellt sind.</p>
<p>Vor Aufnahme jeglicher Taetigkeit hat der Haendler bzw. Broker zu pruefen, ob die erforderlichen Genehmigungen, Registrierungen, Offenlegungen und sonstigen Voraussetzungen vorliegen. Allein die weltweite Abrufbarkeit eines Produktlinks stellt keine Erlaubnis zum weltweiten Vertrieb des Produkts dar.</p>

<h4>&sect; 4 Pflichten des Haendlers bzw. Brokers</h4>
<p>Der Haendler bzw. Broker verpflichtet sich ausdruecklich,</p>
<ul>
  <li>alle geltenden Werbe- und Vertriebsbeschraenkungen einzuhalten;</li>
  <li>von einer auf Personen in der EU ausgerichteten Bewerbung oder Vermittlung der Produkte abzusehen;</li>
  <li>keine unzulaessigen Renditeversprechen, Gewinngarantien oder irrefuehrenden Aussagen zu machen;</li>
  <li>Produktlinks und Werbematerialien nur dort zu verwenden, wo dies rechtlich zulaessig ist;</li>
  <li>diese Beschraenkungen weder direkt noch ueber Dritte noch durch technische Massnahmen zu umgehen.</li>
</ul>
<p>Im Falle eines Verstosses koennen die betroffenen Unternehmen gemaess ihren vertraglichen Vereinbarungen die Berechtigung zur Nutzung von Produktlinks sowie den Zugang zu Vertriebsfunktionen aussetzen. Weitergehende Rechte und Ansprueche richten sich nach dem anwendbaren Recht und den jeweiligen Vertraegen.</p>

<h4>&sect; 5 Verbindliche elektronische Bestaetigung</h4>
<p>Durch die aktive elektronische Bestaetigung erklaert der Haendler bzw. Broker, die vorstehenden Bestimmungen gelesen und verstanden zu haben und sich zu deren Einhaltung zu verpflichten.</p>
<p>Die Bestaetigung ist Voraussetzung fuer die Freischaltung der Funktion "Produktlink kopieren". Zu Beweiszwecken werden die Bestaetigung, eine eindeutige Benutzerkennung, Datum und Uhrzeit sowie die akzeptierte Version der Erklaerung im System gespeichert.</p>
<p>Die Bestaetigung ersetzt keine behoerdliche Genehmigung oder sonstige gegebenenfalls anwendbare gesetzliche Anforderung.</p>

<h4>Bestaetigung im Dashboard</h4>
<p>Ich bestaetige ausdruecklich, die vorstehenden Werbe- und Vertriebsbeschraenkungen gelesen und verstanden zu haben. Mir ist bewusst, dass ich die genannten EasyGold-Token, Anteile und Anlageprodukte nicht gegenueber Personen innerhalb der Europaeischen Union bewerben oder vermitteln darf. Ich verpflichte mich, diese Produkte nur in Laendern und in einer Weise zu bewerben oder zu vermitteln, in denen dies rechtlich zulaessig ist.</p>
`;

async function seedBrokerProductDeclarationTerms() {
  try {
    const [existingRows] = await db.sequelize.query(
      "SELECT `id` FROM `terms_and_conditions` WHERE `document_key` = :document_key LIMIT 1;",
      { replacements: { document_key: DOCUMENT_KEY } }
    );

    if (existingRows.length === 0) {
      await db.sequelize.query(
        `INSERT INTO \`terms_and_conditions\`
          (\`english_name\`, \`german_name\`, \`english_template_text\`, \`german_template_text\`, \`showonregister\`, \`document_key\`, \`createdAt\`, \`updatedAt\`)
         VALUES
          (:english_name, :german_name, :english_template_text, :german_template_text, false, :document_key, NOW(), NOW());`,
        {
          replacements: {
            english_name: ENGLISH_NAME,
            german_name: GERMAN_NAME,
            english_template_text: ENGLISH_TEMPLATE_TEXT,
            german_template_text: GERMAN_TEMPLATE_TEXT,
            document_key: DOCUMENT_KEY,
          },
        }
      );
      console.log("✅ Seeded broker_product_declaration terms_and_conditions entry.");
    } else {
      console.log("ℹ️ broker_product_declaration terms_and_conditions entry already exists, skipping seed.");
    }
  } catch (error) {
    console.error("❌ Error seeding broker_product_declaration terms:", error);
    throw error;
  }
}

module.exports = seedBrokerProductDeclarationTerms;
