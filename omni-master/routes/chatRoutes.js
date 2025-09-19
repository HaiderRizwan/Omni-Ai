const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createChat,
  getChats,
  getChat,
  sendMessage,
  addImageMessage,
  addAvatarMessage,
  updateChatSettings,
  deleteChat,
  migrateChatTypes
} = require('../controllers/chatController');

// Import middleware
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

// All chat routes require authentication
router.use(protect);

// Configure multer for chat attachments
const attachmentsDir = path.join(__dirname, '../uploads/attachments');
fs.mkdirSync(attachmentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, attachmentsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/csv',
    'application/json',
    'text/html',
    'text/rtf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Chat CRUD routes
router.post('/', createChat);
router.get('/', getChats);
router.get('/:id', getChat);
router.patch('/:id/settings', updateChatSettings);
router.delete('/:id', deleteChat);

// Migration route
router.post('/migrate', migrateChatTypes);

// Chat message routes
router.post('/:id/message', sendMessage);
router.post('/:id/image-message', addImageMessage);
router.post('/:id/avatar-message', addAvatarMessage);

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
  res.json({ message: 'Chat routes are working', timestamp: new Date().toISOString() });
});

// Chat attachment upload (single file)
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  console.log('=== ATTACHMENT UPLOAD STARTED ===');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  
  try {
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('File received successfully:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Build public URL relative to server
    const publicPath = `/uploads/attachments/${req.file.filename}`;
    
    // Convert document to plain text
    let convertedText = null;
    let conversionStatus = 'not_converted';
    
    try {
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      const mime = req.file.mimetype || '';
      
      console.log('File upload debug:', {
        filename: req.file.originalname,
        extension: ext,
        mimeType: mime,
        size: req.file.size,
        isPDF: mime === 'application/pdf' || ext === '.pdf',
        pdfCheck1: mime === 'application/pdf',
        pdfCheck2: ext === '.pdf'
      });
      
      if (mime === 'application/pdf' || ext === '.pdf') {
        // Convert PDF to text using existing document controller
        console.log('✅ PDF detected - Attempting PDF conversion...');
        try {
          const { convertPdfToText } = require('../controllers/documentController');
          const result = await convertPdfToText(req.file.path);
          convertedText = result.content;
          conversionStatus = 'converted';
          console.log('PDF conversion successful:', { textLength: result.content.length, pages: result.pages });
        } catch (pdfError) {
          console.error('PDF conversion error:', pdfError.message);
          // Try direct PDF parsing as fallback
          try {
            console.log('Trying direct PDF parsing as fallback...');
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(req.file.path);
            const data = await pdfParse(dataBuffer);
            convertedText = data.text;
            conversionStatus = 'converted';
            console.log('Direct PDF parsing successful:', { textLength: data.text.length, pages: data.numpages });
          } catch (fallbackError) {
            console.error('Direct PDF parsing also failed:', fallbackError.message);
            conversionStatus = 'conversion_failed';
          }
        }
      } else if (mime.startsWith('text/') || ext === '.txt' || ext === '.md' || ext === '.log' || ext === '.rtf' || ext === '.doc' || ext === '.docx') {
        // Read text file (try UTF-8 first, fallback to other encodings)
        try {
          convertedText = fs.readFileSync(req.file.path, 'utf8');
        } catch (e) {
          // Try with different encoding if UTF-8 fails
          convertedText = fs.readFileSync(req.file.path, 'latin1');
        }
        conversionStatus = 'converted';
      } else if (mime === 'text/csv' || mime === 'application/csv' || ext === '.csv') {
        // Convert CSV using existing document controller
        console.log('Attempting CSV conversion...');
        try {
          const { convertCsvToJson } = require('../controllers/documentController');
          const result = await convertCsvToJson(req.file.path);
          convertedText = JSON.stringify(result, null, 2);
          conversionStatus = 'converted';
          console.log('CSV conversion successful:', { rows: result.data.length });
        } catch (csvError) {
          console.error('CSV conversion error:', csvError.message);
          conversionStatus = 'conversion_failed';
        }
      } else if (mime === 'application/json' || ext === '.json') {
        // Convert JSON to plain text
        const jsonData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
        convertedText = JSON.stringify(jsonData, null, 2);
        conversionStatus = 'converted';
      } else if (mime === 'text/html' || ext === '.html' || ext === '.htm') {
        // Convert HTML to plain text (strip tags)
        const htmlContent = fs.readFileSync(req.file.path, 'utf8');
        convertedText = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        conversionStatus = 'converted';
      } else if (ext === '.pdf') {
        // Force PDF conversion if extension is .pdf but MIME type is wrong
        console.log('Force PDF conversion due to .pdf extension');
        try {
          const { convertPdfToText } = require('../controllers/documentController');
          const result = await convertPdfToText(req.file.path);
          convertedText = result.content;
          conversionStatus = 'converted';
          console.log('Force PDF conversion successful:', { textLength: result.content.length, pages: result.pages });
        } catch (pdfError) {
          console.error('Force PDF conversion error:', pdfError.message);
          conversionStatus = 'conversion_failed';
        }
      } else {
        console.log('❌ No conversion method matched - trying fallback');
        // Try to read as text as a fallback
        try {
          convertedText = fs.readFileSync(req.file.path, 'utf8');
          conversionStatus = 'converted';
        } catch (fallbackError) {
          console.log('Fallback text reading failed:', fallbackError.message);
          conversionStatus = 'not_converted';
        }
      }
    } catch (conversionError) {
      console.log('Document conversion failed:', conversionError.message);
      conversionStatus = 'conversion_failed';
    }

    console.log('=== FINAL RESULT ===', {
      filename: req.file.originalname,
      conversionStatus,
      textLength: convertedText?.length || 0,
      convertedTextPreview: convertedText?.substring(0, 100) || 'null'
    });

    res.status(201).json({
      success: true,
      data: {
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: publicPath,
        convertedText,
        conversionStatus
      }
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload attachment', error: error.message });
  }
});

module.exports = router;
