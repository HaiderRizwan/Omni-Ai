const { TwitterApi } = require('twitter-api-v2');
const User = require('../models/User');

function getServerBase(req) {
  const serverBase = String(process.env.API_BASE_URL || '').trim();
  if (serverBase) return serverBase.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function getFrontendBase(req) {
  const envUrl = String(process.env.FRONTEND_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// GET /api/socials/x/auth-url
async function getXAuthUrl(req, res) {
  try {
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const callbackUrl = `${getServerBase(req)}/api/socials/x/callback`;
    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'X OAuth not configured' });
    }

    const client = new TwitterApi({ clientId, clientSecret });
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
    });

    // Store verifier and state in server-side memory keyed by user for demo; in prod, use DB/Redis
    req.session = req.session || {};
    req.session.xOauth = { codeVerifier, state };

    return res.status(200).json({ success: true, url });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create X auth URL', error: error.message });
  }
}

// GET /api/socials/x/callback
async function handleXCallback(req, res) {
  try {
    const { state, code } = req.query;
    if (!state || !code) return res.status(400).send('Missing state or code');

    const stored = (req.session && req.session.xOauth) || {};
    if (!stored.state || stored.state !== state) return res.status(400).send('Invalid OAuth state');

    const client = new TwitterApi({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET
    });
    const callbackUrl = `${getServerBase(req)}/api/socials/x/callback`;
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier: stored.codeVerifier,
      redirectUri: callbackUrl
    });

    const me = await loggedClient.v2.me();

    // Persist tokens to user
    const user = await User.findById(req.user._id).select('+xAccessToken +xRefreshToken');
    if (!user) return res.status(404).send('User not found');

    user.xUserId = me.data.id;
    user.xUsername = me.data.username;
    await user.updateXTokens({ accessToken, refreshToken, expiresIn, scopes: ['tweet.read','tweet.write','users.read','offline.access'] });

    const frontend = getFrontendBase(req);
    return res.redirect(302, `${frontend}/oauth/success?provider=x`);
  } catch (error) {
    const frontend = getFrontendBase(req);
    return res.redirect(302, `${frontend}/oauth/error?provider=x&message=${encodeURIComponent(error.message)}`);
  }
}

async function getXClientForUser(user) {
  if (!user.xAccessToken) throw new Error('X not connected');
  // twitter-api-v2 handles refresh via separate call; for simplicity, reuse stored token
  return new TwitterApi(user.xAccessToken);
}

// POST /api/socials/x/tweet { text }
async function postTweet(req, res) {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ success: false, message: 'Missing text' });
    const user = await User.findById(req.user._id).select('+xAccessToken +xRefreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.xAccessToken) return res.status(400).json({ success: false, message: 'X account not connected' });

    const client = await getXClientForUser(user);
    const resp = await client.v2.tweet(String(text).slice(0, 280));
    return res.status(200).json({ success: true, data: resp.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to post tweet', error: error.message });
  }
}

module.exports = {
  getXAuthUrl,
  handleXCallback,
  postTweet
};


