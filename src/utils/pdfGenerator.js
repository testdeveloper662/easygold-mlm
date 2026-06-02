const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function generatePDF(data, templateName, outputfolder, outputFileName) {
    let browser;

    try {
        const templatePath = path.join(__dirname, "..", "templates", templateName);

        let html = fs.readFileSync(templatePath, "utf8");

        // Replace dynamic variables
        Object.keys(data).forEach((key) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            html = html.replace(regex, data[key] ?? "");
        });

        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote",
            ],
        });

        const page = await browser.newPage();

        // Optional timeout increase
        page.setDefaultNavigationTimeout(0);

        await page.setContent(html, {
            waitUntil: "domcontentloaded",
            timeout: 0,
        });

        await page.waitForNetworkIdle({
            idleTime: 1000,
            timeout: 30000,
        });

        await page.evaluate(async () => {
            const selectors = Array.from(document.images);

            await Promise.all(
                selectors.map((img) => {
                    if (img.complete) return;

                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            );
        });

        const outputDir = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "uploads",
            outputfolder
        );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, outputFileName);

        await page.emulateMediaType("screen");

        await page.pdf({
            path: outputPath,
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
        });

        await page.close();
        await browser.close();

        const publicUrl =
            process.env.NODE_URL +
            `uploads/${outputfolder}/${outputFileName}`;

        return {
            success: true,
            filePath: outputPath,
            url: publicUrl,
        };
    } catch (err) {
        console.error("PDF Generation Error:", err);

        if (browser) {
            await browser.close();
        }

        return {
            success: false,
            error: err.message,
        };
    }
}

module.exports = { generatePDF };