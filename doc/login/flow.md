Login Flow from vinc-b2b
Overview

vinc-b2b (Client) Commerce Suite (SSO Provider)
│ │
│ 1. Redirect to /auth/login │
│ ─────────────────────────────────────>│
│ │
│ │ 2. Show login form
│ │ 3. Validate credentials
│ │ 4. Generate auth code
│ │
│ 5. Redirect to callback with code │
│ <─────────────────────────────────────│
│ │
│ 6. POST /api/auth/token │
│ ─────────────────────────────────────>│
│ │
│ 7. Return access_token, refresh_token │
│ <─────────────────────────────────────│
│ │
│ 8. Store tokens, user logged in │
└────────────────────────────────────────┘
Step 1: Initiate Login (vinc-b2b)
Create a login button/link that redirects to Commerce Suite:

// In vinc-b2b: /app/api/auth/login/route.ts or a login page

const SSO_URL = process.env.SSO_URL; // e.g., https://cs.vendereincloud.it
const CLIENT_ID = "vinc-b2b";
const TENANT_ID = process.env.TENANT_ID; // e.g., "hidros-it"

// Build the redirect URL (your callback endpoint)
const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

// Generate state for CSRF protection
const state = crypto.randomUUID();
// Store state in cookie/session for verification

// Redirect to SSO
const loginUrl = new URL(`${SSO_URL}/auth/login`);
loginUrl.searchParams.set("client_id", CLIENT_ID);
loginUrl.searchParams.set("tenant_id", TENANT_ID);
loginUrl.searchParams.set("redirect_uri", redirectUri);
loginUrl.searchParams.set("state", state);
loginUrl.searchParams.set("response_type", "code");

// Redirect user
redirect(loginUrl.toString());
Step 2: Handle Callback (vinc-b2b)

// In vinc-b2b: /app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

const SSO_URL = process.env.SSO_URL;
const CLIENT_ID = "vinc-b2b";
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET; // From OAuth client creation

export async function GET(req: NextRequest) {
const { searchParams } = new URL(req.url);
const code = searchParams.get("code");
const state = searchParams.get("state");
const error = searchParams.get("error");

// Check for errors
if (error) {
return NextResponse.redirect("/login?error=" + error);
}

// Verify state matches (CSRF protection)
// const savedState = cookies().get("oauth_state");
// if (state !== savedState) return error...

// Exchange code for tokens
const tokenRes = await fetch(`${SSO_URL}/api/auth/token`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
grant_type: "authorization_code",
code,
client_id: CLIENT_ID,
client_secret: CLIENT_SECRET,
redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
}),
});

if (!tokenRes.ok) {
const err = await tokenRes.json();
console.error("Token exchange failed:", err);
return NextResponse.redirect("/login?error=token_exchange_failed");
}

const tokens = await tokenRes.json();
// tokens = {
// access_token: "...",
// refresh_token: "...",
// expires_in: 900,
// user: { id, email, name, role, customers, ... },
// tenant_id: "hidros-it",
// session_id: "..."
// }

// Store tokens securely (httpOnly cookies recommended)
const response = NextResponse.redirect("/dashboard");

response.cookies.set("access_token", tokens.access_token, {
httpOnly: true,
secure: process.env.NODE_ENV === "production",
sameSite: "lax",
maxAge: tokens.expires_in,
});

response.cookies.set("refresh*token", tokens.refresh_token, {
httpOnly: true,
secure: process.env.NODE_ENV === "production",
sameSite: "lax",
maxAge: 7 * 24 \_ 60 \* 60, // 7 days
});

return response;
}
Step 3: Refresh Token (vinc-b2b)

// In vinc-b2b: /app/api/auth/refresh/route.ts

export async function POST(req: NextRequest) {
const refreshToken = req.cookies.get("refresh_token")?.value;

if (!refreshToken) {
return NextResponse.json({ error: "No refresh token" }, { status: 401 });
}

const res = await fetch(`${SSO_URL}/api/auth/refresh`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
refresh_token: refreshToken,
client_id: CLIENT_ID,
}),
});

if (!res.ok) {
// Refresh failed - user needs to re-login
return NextResponse.json({ error: "Session expired" }, { status: 401 });
}

const tokens = await res.json();

// Update cookies with new tokens
const response = NextResponse.json({ success: true });
response.cookies.set("access_token", tokens.access_token, { ... });
response.cookies.set("refresh_token", tokens.refresh_token, { ... });

return response;
}
Environment Variables (vinc-b2b)

# .env.local

SSO_URL=https://cs.vendereincloud.it
SSO_CLIENT_ID=vinc-b2b
SSO_CLIENT_SECRET=<secret from OAuth client creation>
TENANT_ID=hidros-it
NEXT_PUBLIC_BASE_URL=https://hidros-b2b.vendereincloud.it
Key Points
Item Value
Login URL {SSO_URL}/auth/login
Token URL {SSO_URL}/api/auth/token
Refresh URL {SSO_URL}/api/auth/refresh
client_id vinc-b2b
client_secret Required for token exchange
redirect_uri Must match tenant's configured domain
Tenant Domain Validation
The redirect_uri is validated against:

localhost - always allowed for dev
Tenant domains - configured in Super Admin → Tenants → Multi-Tenant Configuration
Branding URLs - shopUrl/websiteUrl from home-settings
So for hidros-it, if you have https://hidros-b2b.vendereincloud.it configured as a domain, the callback URL https://hidros-b2b.vendereincloud.it/api/auth/callback will be accepted.
