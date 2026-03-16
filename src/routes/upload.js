const express = require("express");
const uploadRouter = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure directory exists
const uploadDir = path.join(__dirname, "../../public/uploads/contracts");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;

    if (
        allowedTypes.test(file.mimetype) &&
        allowedTypes.test(path.extname(file.originalname).toLowerCase())
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image files allowed"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});


// ✅ IMPORTANT: use single("upload")
uploadRouter.post("/", upload.single("upload"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                uploaded: 0,
                error: {
                    message: "No file uploaded",
                },
            });
        }

        const imageUrl =
            process.env.NODE_URL +
            "uploads/contracts/" +
            req.file.filename;

        // CKEditor REQUIRED response format
        return res.json({
            uploaded: 1,
            fileName: req.file.filename,
            url: imageUrl,
        });

    } catch (error) {
        return res.status(500).json({
            uploaded: 0,
            error: {
                message: error.message,
            },
        });
    }
});

module.exports = uploadRouter;