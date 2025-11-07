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
        if (data !== null && data !== "" && data) {
            const file = process.env.NODE_URL + "uploads" + data;
            resolve(file);
        } else {
            const default_path =
                type === "logo"
                    ? `/public/default/logo.png`
                    : `/public/default/default_org.png`;
            const file = process.env.NODE_URL + default_path;
            resolve(file);
        }
    });
};