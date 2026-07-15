import { google } from 'googleapis';
import { getDB } from '../config/mongodb.js';
import { logger } from '../utils/logger.js';
import { mcpManager } from '../mcp/mcpManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keysPath = path.join(__dirname, '../../gcp-oauth.keys.json');
const tokenPath = path.join(__dirname, '../../data/google-calendar-token.json');

// Helper to get dynamic redirect URI from configuration keys
function getOAuthClient() {
	if (!fs.existsSync(keysPath)) {
		throw new Error('Google OAuth credentials file (gcp-oauth.keys.json) is missing.');
	}
	const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
	const config = keys.web || keys.installed;
	if (!config) {
		throw new Error('Invalid Google credentials format. Missing "web" or "installed" key.');
	}
	
	// Dynamic Redirect URI detection (prioritize port 3000 callback, fallback to the first listed)
	const redirectUri = config.redirect_uris.find(uri => uri.includes(':3000')) || config.redirect_uris[0];

	return new google.auth.OAuth2(
		config.client_id,
		config.client_secret,
		redirectUri
	);
}

export const getGoogleAuthUrl = async (req, res) => {
	try {
		const oauth2Client = getOAuthClient();
		const url = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			prompt: 'consent',
			scope: [
				'https://www.googleapis.com/auth/calendar',
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/gmail.readonly',
				'https://www.googleapis.com/auth/gmail.compose'
			]
		});
		res.json({ success: true, url });
	} catch (error) {
		logger.error(`Failed to generate Google Auth URL: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const handleGoogleCallback = async (req, res) => {
	const { code } = req.query;
	if (!code) {
		return res.status(400).send('Authentication code is missing.');
	}

	try {
		const oauth2Client = getOAuthClient();
		const { tokens } = await oauth2Client.getToken(code);
		
		oauth2Client.setCredentials(tokens);
		
		// Fetch user's email to associate connection details
		const oauth2Service = google.oauth2({ version: 'v2', auth: oauth2Client });
		const userInfo = await oauth2Service.userinfo.get();
		const email = userInfo.data.email || 'unknown@gmail.com';

		// 1. Store tokens in MongoDB
		const db = getDB();
		await db.collection('oauth_tokens').updateOne(
			{ provider: 'google' },
			{ $set: { tokens, email, updatedAt: new Date() } },
			{ upsert: true }
		);

		// 2. Write tokens locally for MCP server
		const dataDir = path.dirname(tokenPath);
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
		logger.info(`Successfully saved Google Calendar token to: ${tokenPath}`);

		// 3. Restart the Google Calendar MCP server to pick up new tokens
		try {
			await mcpManager.reconnectServer('google-calendar');
		} catch (err) {
			logger.error(`Failed to automatically reconnect Google Calendar client: ${err.message}`);
		}

		// 3b. Restart the Gmail MCP server to pick up new tokens
		try {
			await mcpManager.reconnectServer('gmail');
		} catch (err) {
			logger.error(`Failed to automatically reconnect Gmail client: ${err.message}`);
		}

		// 4. Redirect user back to React frontend dashboard
		res.redirect('http://localhost:5173/?connected=google');
	} catch (error) {
		logger.error(`Error in Google OAuth callback: ${error.message}`);
		res.status(500).send(`OAuth callback failed: ${error.message}`);
	}
};

export const getGoogleAuthStatus = async (req, res) => {
	try {
		const db = getDB();
		const tokenDoc = await db.collection('oauth_tokens').findOne({ provider: 'google' });
		
		if (tokenDoc && tokenDoc.tokens) {
			res.json({
				success: true,
				connected: true,
				email: tokenDoc.email || 'Connected'
			});
		} else {
			res.json({
				success: true,
				connected: false
			});
		}
	} catch (error) {
		logger.error(`Failed to fetch Google auth status: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const disconnectGoogle = async (req, res) => {
	try {
		const db = getDB();
		
		// Optional: Revoke tokens on Google servers
		try {
			const tokenDoc = await db.collection('oauth_tokens').findOne({ provider: 'google' });
			if (tokenDoc && tokenDoc.tokens && tokenDoc.tokens.refresh_token) {
				const oauth2Client = getOAuthClient();
				await oauth2Client.revokeToken(tokenDoc.tokens.refresh_token);
				logger.info('Google OAuth tokens revoked successfully on Google APIs server.');
			}
		} catch (revokeErr) {
			logger.warn(`Failed to revoke token on Google servers (it may have been expired): ${revokeErr.message}`);
		}

		// Delete token document in database
		await db.collection('oauth_tokens').deleteOne({ provider: 'google' });

		// Clear local token path file
		if (fs.existsSync(tokenPath)) {
			fs.unlinkSync(tokenPath);
		}

		// Shutdown/Disconnect the Google Calendar MCP client
		try {
			await mcpManager.disconnectServer('google-calendar');
		} catch (err) {
			logger.error(`Failed to gracefully disconnect Google Calendar: ${err.message}`);
		}

		// Shutdown/Disconnect the Gmail MCP client
		try {
			await mcpManager.disconnectServer('gmail');
		} catch (err) {
			logger.error(`Failed to gracefully disconnect Gmail: ${err.message}`);
		}

		res.json({ success: true });
	} catch (error) {
		logger.error(`Failed to disconnect Google connection: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
