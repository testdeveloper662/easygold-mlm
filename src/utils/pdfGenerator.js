const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function generatePDF(data, templateName, outputfolder, outputFileName) {
    try {
        const templatePath = path.join(__dirname, "..", "templates", templateName);
        let html = fs.readFileSync(templatePath, "utf8");

        // Replace {{keys}} dynamically
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            html = html.replace(regex, data[key] ?? "");
        });

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const outputDir = path.join(__dirname, "..", "..", "public", "uploads", outputfolder);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, outputFileName);

        await page.setExtraHTTPHeaders({
            "User-Agent": "Mozilla/5.0"
        });

        await page.emulateMediaType("screen");

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true
        });

        await browser.close();

        const publicUrl = process.env.NODE_URL + `uploads/payouts/${outputFileName}`;

        return {
            success: true,
            filePath: outputPath,
            url: publicUrl
        };

    } catch (err) {
        console.error("PDF Generation Error:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { generatePDF };
