module.exports = {
  "/api/v1/upload-image/": {
    post: {
      tags: ["Upload"],
      summary: "Upload image file for CKEditor / contracts",
      description: "Uploads an image (JPEG, PNG, GIF, WEBP) up to 5MB, returns public URL compatible with CKEditor.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["upload"],
              properties: {
                upload: {
                  type: "string",
                  format: "binary",
                  description: "Image file to upload",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Image uploaded successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  uploaded: { type: "integer", example: 1 },
                  fileName: { type: "string", example: "1710000000-123456789.png" },
                  url: { type: "string", example: "http://localhost:4000/uploads/contracts/1710000000-123456789.png" },
                },
              },
            },
          },
        },
        400: { description: "No file uploaded or invalid file format" },
      },
    },
  },
};
