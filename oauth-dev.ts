// oauth-dev.ts (run with: npx tsx oauth-dev.ts)
// Make sure .env contains GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = 8787;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// Step 1: visit http://localhost:8787/oauth/start in your browser
app.get('/oauth/start', (_req, res) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('access_type', 'offline'); // get refresh_token
  url.searchParams.set('prompt', 'consent');      // force showing consent, ensures refresh_token
  res.redirect(url.toString());
});

// Step 2: Google redirects here with ?code=...
app.get('/oauth2callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    if (!code) throw new Error('No code in callback');

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await tokenResp.json();
    if (!tokenResp.ok) throw new Error(JSON.stringify(json));

    // Show the refresh token and access token once
    const html = `
      <pre style="font-size:14px;line-height:1.4">
access_token: ${json.access_token}
expires_in : ${json.expires_in}
refresh_token: ${json.refresh_token || '(already granted before — see notes)'}
scope: ${json.scope}
token_type: ${json.token_type}
      </pre>
      <p>Copy <b>refresh_token</b> into your .env as <code>GOOGLE_REFRESH_TOKEN</code>.</p>
    `;
    console.log('[oauth] token response:', json);
    res.send(html);
  } catch (e: any) {
    res.status(500).send(`<pre>${e?.message || e}</pre>`);
  }
});

app.listen(PORT, () => {
  console.log(`OAuth helper listening on http://localhost:${PORT}`);
  console.log(`Start here: http://localhost:${PORT}/oauth/start`);
});
