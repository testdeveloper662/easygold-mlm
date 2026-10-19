module.exports = {
  "/api/v1/upload-image/": {
    post: {
      tags: ["Upload"],
      summary: "Upload image file for CKEditor / contracts",
      description: "Uploads an image (JPEG, PNG, GIF, WEBP) up to 5MB, returns public URL compatible with CKEditor.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": { schema: { "$ref": "#/components/schemas/ImageUploadRequest" } },
        },
      },
      responses: {
        200: {
          description: "Image uploaded successfully",
          content: {
            "application/json": { schema: { "$ref": "#/components/schemas/ImageUploadResponse" } },
          },
        },
        400: { description: "No file uploaded" },
        500: {
          description: "KNOWN BUG, not a documentation choice: an invalid file type or an oversized file is rejected by multer's fileFilter via cb(new Error(...)), which bypasses this route's own try/catch and falls through to Express's default error handler — since no custom error-handling middleware is registered, this returns a plain HTML 500 page, not a clean JSON 400. Needs a dedicated Express error handler to fix.",
        },
      },
    },
  },
};
