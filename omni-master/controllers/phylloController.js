const axios = require('axios');
const User = require('../models/User');

// Base Phyllo API URL
const PHYLLO_BASE_URL = process.env.PHYLLO_BASE_URL || 'https://api.getphyllo.com/v1';
const DEBUG_PHYLLO = String(process.env.DEBUG_PHYLLO || '').toLowerCase() === 'true';

function logDebug(...args) {
    if (DEBUG_PHYLLO) {
        try { console.log('[Phyllo]', ...args); } catch (_) {}
    }
}

function redact(str) {
    if (!str) return str;
    const s = String(str);
    if (s.length <= 6) return '***';
    return `${s.slice(0, 3)}***${s.slice(-3)}`;
}

// Helpers to build auth header for Phyllo
function getPhylloAuthHeader() {
	const apiKey = process.env.PHYLLO_CLIENT_ID;
	const apiSecret = process.env.PHYLLO_CLIENT_SECRET;
	if (!apiKey || !apiSecret) {
		const err = new Error('Missing PHYLLO_CLIENT_ID or PHYLLO_CLIENT_SECRET');
		err.statusCode = 400;
		throw err;
	}
	const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
	const header = { Authorization: `Basic ${basic}` };
	logDebug('Auth header prepared', { clientId: redact(apiKey), baseUrl: PHYLLO_BASE_URL });
	return header;
}

// POST /api/phyllo/users
// Creates a Phyllo user (creator) and returns the user object
const createPhylloUser = async (req, res) => {
	try {
		const { name, externalId } = req.body || {};
		if (!name) {
			return res.status(400).json({ success: false, message: 'name is required' });
		}
		if (!externalId && !req.user?._id) {
			return res.status(400).json({ success: false, message: 'externalId is required' });
		}
		// If user in DB already has a phylloUserId, reuse it
		if (req.user) {
			const me = await User.findById(req.user._id).lean();
			if (me?.phylloUserId) {
				return res.json({ success: true, user: { id: me.phylloUserId } });
			}
		}

		logDebug('createPhylloUser → request', {
			baseUrl: PHYLLO_BASE_URL,
			payload: { name, external_id: externalId }
		});

		const response = await axios.post(
			`${PHYLLO_BASE_URL}/users`,
			{ name, external_id: externalId },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);

		logDebug('createPhylloUser ← response', {
			status: response.status,
			dataKeys: Object.keys(response.data || {})
		});

		const created = response.data;
		// Persist phylloUserId on our user
		if (req.user && created?.id) {
			await User.updateOne({ _id: req.user._id }, { $set: { phylloUserId: created.id } });
		}

		return res.json({ success: true, user: created });
	} catch (err) {
		logDebug('createPhylloUser × error', {
			status: err.response?.status,
			data: err.response?.data,
			message: err.message
		});
		// Normalize Phyllo upstream auth errors to avoid confusing 401 in frontend
		const upstreamStatus = err.response?.status;
		const upstreamMsg = err.response?.data?.message || err.response?.data?.error;
		if (upstreamStatus === 401 || upstreamStatus === 403) {
			return res.status(502).json({ success: false, message: upstreamMsg || 'Phyllo authentication failed. Check PHYLLO_CLIENT_ID/PHYLLO_CLIENT_SECRET.' });
		}
		const status = err.statusCode || upstreamStatus || 500;
		const msg = upstreamMsg || err.message;
		return res.status(status).json({ success: false, message: msg });
	}
};

// POST /api/phyllo/sdk-token
// Generates a Connect SDK token for a given user_id
const generateSdkToken = async (req, res) => {
	try {
		const { userId } = req.body || {};
		if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
		logDebug('generateSdkToken → request', {
			baseUrl: PHYLLO_BASE_URL,
			payload: { user_id: userId }
		});
		const response = await axios.post(
			`${PHYLLO_BASE_URL}/sdk-tokens`,
			{ user_id: userId },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);
		logDebug('generateSdkToken ← response', { status: response.status, dataKeys: Object.keys(response.data || {}) });
		return res.json({ success: true, token: response.data });
	} catch (err) {
		logDebug('generateSdkToken × error', {
			status: err.response?.status,
			data: err.response?.data,
			message: err.message
		});
		const upstreamStatus = err.response?.status;
		const upstreamMsg = err.response?.data?.message || err.response?.data?.error;
		if (upstreamStatus === 401 || upstreamStatus === 403) {
			return res.status(502).json({ success: false, message: upstreamMsg || 'Phyllo authentication failed. Check PHYLLO_CLIENT_ID/PHYLLO_CLIENT_SECRET.' });
		}
		return res.status(upstreamStatus || 500).json({ success: false, message: upstreamMsg || err.message });
	}
};

// POST /api/phyllo/webhook
// Receives webhook events from Phyllo
const handleWebhook = async (req, res) => {
	try {
		// Optionally verify signature if configured
		// Process event based on type
		const event = req.body || {};
		console.log('Phyllo webhook event:', JSON.stringify(event));

		// Example: handle account linked event to cache accounts on user
		if (event?.type === 'account.connected' && event?.data) {
			const { user_id: phylloUserId, account_id: accountId, platform, username, profile_url, connected_at } = event.data;
			if (phylloUserId && accountId) {
				await User.updateOne(
					{ phylloUserId },
					{
						$setOnInsert: { phylloUserId },
						$addToSet: {
							phylloAccounts: {
								accountId,
								platform,
								username,
								profileUrl: profile_url,
								connectedAt: connected_at ? new Date(connected_at) : new Date()
							}
						}
					}
				);
			}
		}
		return res.status(200).json({ received: true });
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message });
	}
};

// POST /api/phyllo/publish
// Proxy to Phyllo publishing APIs to create a post on a connected account
// Expected body: { accountId, content: { title, text, media_url, ... } }
const publishContent = async (req, res) => {
	try {
		const { accountId, content } = req.body || {};
		if (!accountId || !content) {
			return res.status(400).json({ success: false, message: 'accountId and content are required' });
		}
		// Optional: ensure the account belongs to the authenticated user if auth middleware is used
		// if (req.user?.phylloUserId) { ... fetch user accounts and verify ... }
		logDebug('publishContent → request', {
			baseUrl: PHYLLO_BASE_URL,
			payload: { account_id: accountId, ...content }
		});
		const response = await axios.post(
			`${PHYLLO_BASE_URL}/publishing/posts`,
			{ account_id: accountId, ...content },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);
		logDebug('publishContent ← response', { status: response.status, dataKeys: Object.keys(response.data || {}) });
		return res.json({ success: true, post: response.data });
	} catch (err) {
		logDebug('publishContent × error', {
			status: err.response?.status,
			data: err.response?.data,
			message: err.message
		});
		return res.status(500).json({ success: false, message: err.message });
	}
};

// GET /api/phyllo/accounts/:phylloUserId
// Fetch connected accounts from Phyllo for a given user
const listAccounts = async (req, res) => {
	try {
		const { phylloUserId } = req.params;
		if (!phylloUserId) return res.status(400).json({ success: false, message: 'phylloUserId is required' });
		logDebug('listAccounts → request', { baseUrl: PHYLLO_BASE_URL, phylloUserId });
		const response = await axios.get(
			`${PHYLLO_BASE_URL}/users/${phylloUserId}/accounts`,
			{ headers: { ...getPhylloAuthHeader() } }
		);
		logDebug('listAccounts ← response', { status: response.status, keys: Object.keys(response.data || {}) });
		return res.json({ success: true, accounts: response.data?.data || response.data });
	} catch (err) {
		logDebug('listAccounts × error', {
			status: err.response?.status,
			data: err.response?.data,
			message: err.message
		});
		return res.status(500).json({ success: false, message: err.message });
	}
};

module.exports = {
	createPhylloUser,
	generateSdkToken,
	handleWebhook,
	publishContent,
	listAccounts
};


