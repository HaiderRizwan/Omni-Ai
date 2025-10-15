const { google } = require('googleapis');
const User = require('../models/User');

function getBaseUrl(req) {
  const envUrl = String(process.env.FRONTEND_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (proto && host) return `${proto}://${host}`;
  return 'http://localhost:3000';
}

function getOAuthClient(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serverBase = String(process.env.API_BASE_URL || '').trim();
  const cbBase = serverBase || `${req.protocol || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const redirectUri = `${cbBase}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    const msg = 'Google OAuth not configured: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing';
    const err = new Error(msg);
    err.statusCode = 500;
    err.details = { redirectUri };
    throw err;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// GET /api/auth/google/url
const getAuthUrl = async (req, res) => {
  try {
    const oauth2Client = getOAuthClient(req);
    const scopes = (process.env.GOOGLE_SCOPES || 'openid email profile').split(/[,\s]+/).filter(Boolean);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
    res.status(200).json({ success: true, url });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: 'Failed to create Google auth URL', error: error.message, details: error.details || undefined });
  }
};

// GET /api/auth/google/callback
const handleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const oauth2Client = getOAuthClient(req);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    // Upsert user by googleId or email
    const email = profile.email?.toLowerCase();
    let user = await User.findOne({ $or: [ { googleId: profile.id }, { email } ] }).select('+googleAccessToken +googleRefreshToken');
    if (!user) {
      // Create basic user; password not required for OAuth users, set random hash placeholder
      const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      user = await User.create({
        username: email?.split('@')[0] || `google_${profile.id}`,
        email,
        password: randomPassword,
        firstName: profile.given_name || 'Google',
        lastName: profile.family_name || 'User'
      });
    }

    user.googleId = profile.id;
    user.googleEmail = email || user.googleEmail;
    user.googleScopes = Array.from(new Set([ ...(user.googleScopes || []), ...(((tokens.scope || '').split(' ')).filter(Boolean)) ]));
    await user.updateGoogleTokens(tokens);

    // Issue a JWT via existing logic
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const frontendBase = getBaseUrl(req);
    const payload = new URLSearchParams({ provider: 'google', token, user: JSON.stringify(user.toJSON()) }).toString();
    const redirectTo = `${frontendBase}/oauth/success?${payload}`;
    return res.redirect(302, redirectTo);
  } catch (error) {
    const frontendBase = getBaseUrl(req);
    return res.redirect(302, `${frontendBase}/oauth/error?provider=google&message=${encodeURIComponent(error.message)}`);
  }
};

// GET /api/auth/google/profile (requires auth)
const getGoogleProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({
      success: true,
      data: {
        connected: Boolean(user.googleId && user.googleAccessToken),
        googleEmail: user.googleEmail,
        scopes: user.googleScopes,
        tokenExpiry: user.googleTokenExpiry
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Google profile', error: error.message });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  getGoogleProfile
};

// Helper: get authorized oauth2 client for a user (refresh if needed)
async function getAuthorizedGoogleClientForUser(userId) {
  const user = await User.findById(userId).select('+googleAccessToken +googleRefreshToken');
  if (!user || !user.googleAccessToken) throw new Error('Google not connected');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/auth/google/callback` : undefined
  );
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : undefined
  });

  // Auto-refresh if expired
  const now = Date.now();
  if (!user.googleTokenExpiry || user.googleTokenExpiry.getTime() <= now) {
    const refreshed = await oauth2Client.refreshAccessToken();
    await user.updateGoogleTokens(refreshed.credentials);
    oauth2Client.setCredentials(refreshed.credentials);
  }

  return oauth2Client;
}

module.exports.getAuthorizedGoogleClientForUser = getAuthorizedGoogleClientForUser;

// GET /api/auth/google/debug (returns redirectUri and config status)
const debugGoogleConfig = (req, res) => {
  const serverBase = String(process.env.API_BASE_URL || '').trim();
  const cbBase = serverBase || `${req.protocol || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const redirectUri = `${cbBase}/api/auth/google/callback`;
  res.status(200).json({
    success: true,
    data: {
      redirectUri,
      hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      apiBaseUrl: serverBase || null
    }
  });
};

module.exports.debugGoogleConfig = debugGoogleConfig;


