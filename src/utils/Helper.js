const jwt = require("jsonwebtoken");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

exports.getUserFromToken = async (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
            if (err) {
                return reject(new Error("errors.invalid_token"));
            }
            const user = decoded;

            if (user && user.user) {
                resolve(user.user);
            } else {
                reject(new Error("errors.user_not_exist"));
            }
        });
    });
};

exports.uploadProfilePicture = async (file, dir, type, isFileExist) => {
    try {
        if (!file) return null; // No file uploaded

        const uploadDir = path.join(__dirname, dir);

        // Ensure the directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        // Delete existing profile picture if exists
        if (isFileExist) {
            const oldFilePath = path.join(
                uploadDir,
                path.basename(isFileExist)
            );
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Save the new file
        fs.writeFileSync(filePath, file.buffer);

        // Return relative path for DB storage
        return `/${type}/${fileName}`;
    } catch (error) {
        console.error("Error in uploading profile picture:", error);
        throw new Error("file_upload_error");
    }
};

exports.generateImageUrl = async (data, type) => {
    return new Promise((resolve, reject) => {
        if (!process.env.NODE_URL) {
            return reject(new Error("NODE_URL is not defined in environment variables. Please set it in .env file."));
        }

        const baseUrl = process.env.NODE_URL;
        
        const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        
        if (data !== null && data !== "" && data) {
            const normalizedData = data.startsWith("/") ? data.substring(1) : data;
            const file = normalizedBaseUrl + "uploads/" + normalizedData;
            resolve(file);
        } else {
            const default_path =
                type === "logo"
                    ? `public/default/logo.png`
                    : `public/default/default_org.png`;
            const file = normalizedBaseUrl + default_path;
            resolve(file);
        }
    });
};

exports.roundToTwoDecimalPlaces = (num) => {
    if (num === null || num === undefined) {
        console.log("num is required");
    }
    if (typeof num !== "number" || isNaN(num)) {
        console.log("num must be a valid number");
    }
    return Math.round(num * 100) / 100;
}

exports.companyAddressMap = () => ({
    EASYGOLD_TOKEN: `
HARTMANN & BENZ, LLC
a District of Columbia limited liability company
1717 N Street, NW STE 1
Washington, DC 20036
www.easygold.io
    `.trim(),

    PRIMEINVEST: `
Hartmann & Benz Inc
8 The Green, Suite A
19901 Dover Kent County
United States of America (USA)
    `.trim(),

    GOLDFLEX: `
HARTMANN & BENZ LIMITED 
28B , ONIKEPO AKANDE, LEKKI 
PHASE 1, LAGOS,
NIGERIA
    `.trim(),

    B2B_DASHBOARD: `
Hartmann & Benz GmbH
Gutenbergstraße 40
70736 Fellbach
Deutschland
    `.trim()
});


exports.payoutForType = (value) => {
    switch (value) {
        case "EASYGOLD_TOKEN":
            return "Easygold Tokens";

        case "PRIMEINVEST":
            return "Primeinvest";

        case "GOLDFLEX":
            return "Goldflex";

        case "B2B_DASHBOARD":
            return "B2B Dashboard";

        default:
            return value; // fallback (no crash)
    }
}