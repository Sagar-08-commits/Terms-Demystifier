// --- 1. Auth0 Configuration ---
const AUTH0_DOMAIN = "dev-mxp3lipggh7abw8f.us.auth0.com";
const AUTH0_CLIENT_ID = "SgUvydJgR8mZE4N4U3TsUEraxMfSxJus";
const AUTH0_AUDIENCE = "https://api.terms-demystifier.com";
const REDIRECT_URL = `https://${chrome.runtime.id}.chromiumapp.org`;

// Your new backend URL
const LOCAL_BACKEND_URL = "http://localhost:8080/api/analyze";

// --- 2. Helper Functions for PKCE (More Secure) ---
function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateRandomString(length) {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

// --- 3. NEW Refresh Token Function ---
// This silently gets a new access token using our saved refresh token.
async function getNewTokenWithRefresh(refreshToken) {
  console.log("[background.js] Attempting token refresh...");
  try {
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: AUTH0_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      console.error("Refresh failed, no access token.", tokens);
      throw new Error("Refresh token failed.");
    }

    // Save the new tokens (we might get a new refresh token)
    const expires_at = Date.now() + (tokens.expires_in || 3600) * 1000;
    await chrome.storage.local.set({
      auth_token: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken, // Use new one if provided
        expires_at: expires_at,
      },
    });

    console.log("[background.js] Token refreshed successfully.");
    return tokens.access_token;
  } catch (error) {
    console.error("[background.js] Refresh token flow failed:", error);
    // If refresh fails, force a full login by clearing the bad token
    await chrome.storage.local.remove("auth_token");
    throw error;
  }
}

// --- 4. NEW Full Login Flow ---
// This only runs if we have no tokens at all.
async function performFullLogin() {
  console.log("[background.js] No valid token. Starting new login flow.");
  const code_verifier = generateRandomString(64);
  const code_challenge = base64urlencode(await sha256(code_verifier));

  const authUrl =
    `https://${AUTH0_DOMAIN}/authorize?` +
    `client_id=${AUTH0_CLIENT_ID}` +
    `&audience=${AUTH0_AUDIENCE}` +
    `&redirect_uri=${REDIRECT_URL}` +
    `&scope=openid profile email offline_access` + // <-- Ask for offline_access
    `&response_type=code` +
    `&response_mode=query` +
    `&code_challenge=${code_challenge}` +
    `&code_challenge_method=S256`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    const url = new URL(responseUrl);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("No authorization code returned from Auth0.");

    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: AUTH0_CLIENT_ID,
        code_verifier: code_verifier,
        code: code,
        redirect_uri: REDIRECT_URL,
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token || !tokens.refresh_token) {
      console.error("Token exchange failed, missing tokens.", tokens);
      throw new Error("Failed to get refresh token. Check Auth0 settings.");
    }

    const expires_at = Date.now() + (tokens.expires_in || 3600) * 1000;
    await chrome.storage.local.set({
      auth_token: { ...tokens, expires_at },
    });

    console.log(
      "[background.js] Successfully got new token and refresh token."
    );
    return tokens.access_token;
  } catch (error) {
    console.error("[background.js] Auth flow failed:", error);
    throw new Error(`Login failed: ${error.message}`);
  }
}

// --- 5. NEW Smart getAccessToken Function ---
async function getAccessToken() {
  const tokenData = await chrome.storage.local.get("auth_token");

  if (!tokenData.auth_token) {
    // 1. No token at all. Must do full login.
    console.log("[background.js] No token found.");
    return await performFullLogin();
  }

  if (tokenData.auth_token.expires_at > Date.now()) {
    // 2. Token is valid and not expired. Use it.
    console.log("[background.js] Using cached, valid token.");
    return tokenData.auth_token.access_token;
  }

  if (tokenData.auth_token.refresh_token) {
    // 3. Token is expired, but we have a refresh token.
    console.log("[background.js] Access token expired, using refresh token.");
    return await getNewTokenWithRefresh(tokenData.auth_token.refresh_token);
  }

  // 4. Token expired and no refresh token. Must do full login.
  console.log("[background.js] Token expired, no refresh token.");
  return await performFullLogin();
}

// --- 6. Main Message Listener ---
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const { tabId } = message;

  const updatePopupStatus = (statusAction, msg) => {
    chrome.runtime.sendMessage({ action: statusAction, message: msg });
  };
  const sendToContentScript = (action, payload) => {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { action, ...payload });
    }
  };

  console.log(`[background.js] Received message: ${message.action}`);

  let token;
  try {
    // This one function now handles all logic
    token = await getAccessToken();
  } catch (error) {
    console.error("[background.js] Failed to get token:", error);
    updatePopupStatus("analysisError", `Login Failed: ${error.message}.`);
    return;
  }

  // --- Rest of your code is unchanged ---

  if (message.action === "analyzeCurrentPage") {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["contentScript.js"],
      });
      sendToContentScript("extractPageText");
      updatePopupStatus("analysisComplete", "Fetching current page content...");
    } catch (error) {
      updatePopupStatus("analysisError", `Error: ${error.message}`);
    }
    return true;
  }

  if (message.action === "findAndAnalyzeLinked") {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["contentScript.js"],
      });
      sendToContentScript("findLegalLinks");
      updatePopupStatus(
        "analysisComplete",
        "Searching for legal policy links..."
      );
    } catch (error) {
      updatePopupStatus("analysisError", `Error: ${error.message}`);
    }
    return true;
  }

  if (message.action === "legalTextExtracted") {
    const legalText = message.text;
    const pageUrl = message.url;

    if (!legalText || legalText.trim().length < 100) {
      sendToContentScript("displayError", {
        message: "No significant legal text found on this page.",
      });
      updatePopupStatus("analysisError", "No significant legal text found.");
      return;
    }

    try {
      updatePopupStatus(
        "analysisComplete",
        "Sending to AI & saving to dashboard..."
      );
      const aiResult = await callAiBackend(legalText, pageUrl, token); // Pass token

      sendToContentScript("displaySummary", {
        summary: aiResult.summary,
        critical_points: aiResult.critical_points,
      });
      updatePopupStatus(
        "analysisComplete",
        "Analysis complete! Saved to dashboard."
      );
    } catch (error) {
      console.error("[background.js] Error calling AI Backend:", error);
      updatePopupStatus("analysisError", `Analysis failed: ${error.message}`);
    }
    return true;
  }

  if (message.action === "legalLinksFound") {
    const links = message.links;
    if (!links || links.length === 0) {
      sendToContentScript("displayError", {
        message: "No relevant legal policy links found.",
      });
      updatePopupStatus(
        "analysisError",
        "No relevant legal policy links found."
      );
      return;
    }

    try {
      const firstLink = links[0];
      if (!firstLink || !firstLink.url) throw new Error("Invalid link.");

      const linkedPageRawHtml = await fetchPageContent(firstLink.url);
      if (!linkedPageRawHtml || linkedPageRawHtml.trim().length < 500) {
        throw new Error(`No substantial HTML found at ${firstLink.url}.`);
      }

      const aiResult = await callAiBackend(
        linkedPageRawHtml,
        firstLink.url,
        token
      ); // Pass token

      sendToContentScript("displaySummary", {
        summary: `Analysis of linked policy (${
          firstLink.text || firstLink.url
        }): ${aiResult.summary}`,
        critical_points: aiResult.critical_points,
      });
      updatePopupStatus(
        "analysisComplete",
        `Analysis of ${firstLink.text || firstLink.url} complete!`
      );
    } catch (error) {
      console.error("[background.js] Error processing linked policies:", error);
      updatePopupStatus("analysisError", `Failed to analyze: ${error.message}`);
    }
    return true;
  }
});

// --- 7. callAiBackend function (Accepts token) ---
async function callAiBackend(content, url, token) {
  console.log(`[background.js] Calling NEW AI Backend: ${LOCAL_BACKEND_URL}`);

  const response = await fetch(LOCAL_BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: content, url: url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(
      `[background.js] AI Backend responded with error ${response.status}:`,
      errorData
    );
    throw new Error(
      `Backend error: ${response.status} - ${
        errorData.error || response.statusText
      }`
    );
  }

  const jsonResponse = await response.json();
  console.log(`[background.js] AI Backend responded successfully.`);
  return jsonResponse;
}

// --- 8. fetchPageContent (Unchanged) ---
async function fetchPageContent(url) {
  console.log(
    `[background.js] Attempting to fetch RAW HTML content from: ${url}`
  );
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "No response body");
      throw new Error(
        `Failed to fetch raw HTML from ${url}: ${response.status} ${response.statusText}`
      );
    }
    const htmlText = await response.text();
    return htmlText;
  } catch (error) {
    console.error(
      `[background.js] Error fetching raw HTML content from ${url}:`,
      error
    );
    throw error;
  }
}
