/**
 * ONE-TIME SETUP SCRIPT — Run this once to get your Google OAuth refresh token.
 * Usage: node setup_oauth.js
 *
 * Prerequisites:
 *  1. Go to https://console.cloud.google.com/apis/credentials
 *  2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
 *  3. Application type: "Web application"
 *  4. Add Authorized redirect URI: http://localhost:8080/callback
 *  5. Copy the Client ID and Client Secret into your .env file:
 *       GOOGLE_CLIENT_ID=your_client_id
 *       GOOGLE_CLIENT_SECRET=your_client_secret
 *  6. Run: node setup_oauth.js
 *  7. Your browser will open → sign in → authorize
 *  8. The script will print your GOOGLE_REFRESH_TOKEN — copy it to .env
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8080/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing credentials in .env file!');
  console.error('   Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file first.\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:       'consent', // Forces a refresh token to be issued
  scope:        ['https://www.googleapis.com/auth/drive'],
});

console.log('\n🔐 Opening your browser for Google OAuth authorization...');
console.log('   (If the browser does not open, visit this URL manually:)');
console.log('\n  ', authUrl, '\n');

// Open browser (Windows)
exec(`start "" "${authUrl}"`);

// Temporary local server to capture the OAuth callback
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const code = parsedUrl.query.code;

    if (!code) {
      res.writeHead(400);
      res.end('<h1>No authorization code received.</h1>');
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(500);
      res.end('<h1>No refresh token received. Try revoking access at https://myaccount.google.com/permissions and run the script again.</h1>');
      return;
    }

    console.log('\n✅ SUCCESS! Add this line to your .env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h2 style="color:green">✅ Authorization successful!</h2>
      <p>Your refresh token has been printed in the terminal.</p>
      <p>Copy it to your <code>.env</code> file as <code>GOOGLE_REFRESH_TOKEN</code>, then you can close this tab.</p>
    `);

    server.close(() => process.exit(0));
  } catch (err) {
    console.error('❌ Error exchanging code for tokens:', err.message);
    res.writeHead(500);
    res.end(`<h1>Error: ${err.message}</h1>`);
    server.close(() => process.exit(1));
  }
});

server.listen(8080, () => {
  console.log('⏳ Waiting for authorization callback on http://localhost:8080/callback ...');
});
