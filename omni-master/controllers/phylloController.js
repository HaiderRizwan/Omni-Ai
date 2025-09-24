const axios = require('axios');
const User = require('../models/User');

// Base Phyllo API URL
const PHYLLO_BASE_URL = process.env.PHYLLO_BASE_URL || 'https://api.getphyllo.com/v1';

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
	return { Authorization: `Basic ${basic}` };
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

		const response = await axios.post(
			`${PHYLLO_BASE_URL}/users`,
			{ name, external_id: externalId },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);

		const created = response.data;
		// Persist phylloUserId on our user
		if (req.user && created?.id) {
			await User.updateOne({ _id: req.user._id }, { $set: { phylloUserId: created.id } });
		}

		return res.json({ success: true, user: created });
	} catch (err) {
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
		const response = await axios.post(
			`${PHYLLO_BASE_URL}/sdk-tokens`,
			{ user_id: userId },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);
		return res.json({ success: true, token: response.data });
	} catch (err) {
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
		const response = await axios.post(
			`${PHYLLO_BASE_URL}/publishing/posts`,
			{ account_id: accountId, ...content },
			{ headers: { 'Content-Type': 'application/json', ...getPhylloAuthHeader() } }
		);
		return res.json({ success: true, post: response.data });
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message });
	}
};

// GET /api/phyllo/accounts/:phylloUserId
// Fetch connected accounts from Phyllo for a given user
const listAccounts = async (req, res) => {
	try {
		const { phylloUserId } = req.params;
		if (!phylloUserId) return res.status(400).json({ success: false, message: 'phylloUserId is required' });
		const response = await axios.get(
			`${PHYLLO_BASE_URL}/users/${phylloUserId}/accounts`,
			{ headers: { ...getPhylloAuthHeader() } }
		);
		return res.json({ success: true, accounts: response.data?.data || response.data });
	} catch (err) {
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


