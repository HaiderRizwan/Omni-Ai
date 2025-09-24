const express = require('express');
const router = express.Router();

const {
	createPhylloUser,
	generateSdkToken,
	handleWebhook,
	publishContent,
	listAccounts
} = require('../controllers/phylloController');
const { protect } = require('../middleware/auth');

// Allow creating Phyllo user and generating SDK token without JWT to avoid 401 during initial connect
router.post('/users', createPhylloUser);
router.post('/sdk-token', generateSdkToken);
router.post('/webhook', handleWebhook);
router.post('/publish', protect, publishContent);
router.get('/accounts/:phylloUserId', protect, listAccounts);

module.exports = router;


