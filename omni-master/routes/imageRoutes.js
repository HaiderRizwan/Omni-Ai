const express = require('express');
const router = express.Router();
const {
  generateImage,
  getImageJob,
  getImageHistory,
  cancelImageJob,
  hfTextToImage,
  hfControlNet,
  getImage,
  getPublicImage,
  getUserImages,
  deleteImage,
  getAllImages,
  a2eImageToVideo,
  a2eImageEdit
} = require('../controllers/imageController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Import middleware
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

// Public image serving route (no authentication required)
router.get('/public/:id', getPublicImage);
router.options('/public/:id', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

// All other image routes require authentication
router.use(protect);

// Image generation routes (premium feature)
router.post('/generate', requirePremium, generateImage);
router.get('/job/:id', getImageJob);
router.get('/history', getImageHistory);
router.post('/job/:id/cancel', cancelImageJob);

// Hugging Face endpoints
router.post('/hf/text-to-image', requirePremium, hfTextToImage);
router.post('/hf/controlnet', requirePremium, upload.single('controlImage'), hfControlNet);

// A2E endpoints
router.post('/a2e/image-to-video', requirePremium, upload.single('image'), a2eImageToVideo);
router.post('/a2e/edit', requirePremium, upload.single('image'), a2eImageEdit);

// Image storage endpoints
router.get('/', getAllImages);
router.get('/:id', getImage);
router.delete('/:id', deleteImage);

module.exports = router;
