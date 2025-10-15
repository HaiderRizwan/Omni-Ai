const { google } = require('googleapis');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

// Multer setup for temporary disk storage with larger size limit (512MB)
const upload = multer({
  dest: path.join(os.tmpdir(), 'uploads'),
  limits: { fileSize: 512 * 1024 * 1024 }
});

function getOAuthClientForUser(user) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/auth/google/callback` : undefined
  );
  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : undefined
  });
  return client;
}

const uploadMiddleware = upload.single('file');

// POST /api/socials/youtube/upload
const uploadToYouTube = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken');
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ success: false, message: 'Google account not connected' });
    }

    const auth = getOAuthClientForUser(user);
    const youtube = google.youtube({ version: 'v3', auth });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'Missing file' });

    const title = req.body.title || path.parse(file.originalname).name;
    const description = req.body.description || '';

    const isImage = (file.mimetype || '').startsWith('image/');
    const mediaCategory = isImage ? 'image' : 'video';

    // For videos: upload to YouTube. For images: YouTube Shorts supports video only; require video.
    if (isImage) {
      return res.status(400).json({ success: false, message: 'YouTube uploads require video files' });
    }

    const stream = fs.createReadStream(file.path);
    const response = await youtube.videos.insert({
      part: ['snippet','status'],
      requestBody: {
        snippet: {
          title,
          description
        },
        status: {
          privacyStatus: 'private'
        }
      },
      media: {
        body: stream
      }
    });

    // Cleanup temp file
    try { fs.unlinkSync(file.path); } catch (_) {}

    const videoId = response?.data?.id;
    return res.status(200).json({ success: true, data: { videoId, url: videoId ? `https://youtu.be/${videoId}` : null } });
  } catch (error) {
    console.error('[YouTube] Upload error:', error?.response?.data || error);
    return res.status(500).json({ success: false, message: 'Failed to upload to YouTube', error: error?.message });
  }
};

module.exports = {
  uploadMiddleware,
  uploadToYouTube
};


