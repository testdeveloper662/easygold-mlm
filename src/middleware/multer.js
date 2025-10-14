const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = (dirName) => {
  const uploadDir = path.join(__dirname, "../../public/uploads", dirName);

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir); // Directory to save uploaded files
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Save file with a unique name
    },
  });

  return multer({ storage: storage });
};

module.exports = upload;
