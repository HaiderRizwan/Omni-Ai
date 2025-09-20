const fs = require('fs');
const path = require('path');

// Saves a buffer to the local uploads directory and returns a public URL
const saveBufferToUploads = async (originalFilename, buffer) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = String(originalFilename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${safeName}`;
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, buffer);

  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${baseUrl}/uploads/${filename}`;
};

module.exports = { saveBufferToUploads };


