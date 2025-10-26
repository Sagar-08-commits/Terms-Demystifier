// --- Function to extract legal text from current page ---
function extractLegalText() {
  console.log(
    "[contentScript] Starting to extract legal text from current page..."
  );
  const potentialContainers = [
    document.getElementById("privacy-policy"),
    document.getElementById("terms-of-service"),
    document.querySelector("main"),
    document.body, // Fallback
  ];

  let fullText = "";
  for (const container of potentialContainers) {
    if (container) {
      const textContent = container.textContent || container.innerText;
      if (textContent && textContent.trim().length > 500) {
        fullText = textContent.trim();
        console.log(
          `[contentScript] Found significant text in container: ${
            container.id || container.tagName
          }. Length: ${fullText.length}`
        );
        break;
      }
    }
  }
  if (!fullText) {
    console.warn(
      "[contentScript] No significant legal text found using common selectors."
    );
  }
  return fullText;
}

// --- Function to find legal policy links ---
function findLegalLinks() {
  console.log("[contentScript] Starting to find legal links...");
  // Extended keywords for better link detection
  const keywords = [
    "privacy",
    "terms",
    "legal",
    "policy",
    "cookies",
    "cookie-policy",
    "terms-of-service",
    "data",
  ];
  const likelyLinkSelectors = [
    'a[href*="privacy"]',
    'a[href*="terms"]',
    'a[href*="legal"]',
    'a[href*="policy"]',
    'a[href*="cookies"]',
    'a[href*="cookie"]',
    'a[href*="cookie-policy"]',
    'a[href*="terms-of-service"]',
    'a[href*="data"]',
    "footer a",
    "nav a",
  ];

  const foundLinks = new Map();

  const links = document.querySelectorAll(likelyLinkSelectors.join(", "));
  console.log(
    `[contentScript] Found ${links.length} potential anchor tags matching selectors.`
  );

  links.forEach((link) => {
    let href = link.href;
    let text = link.textContent ? link.textContent.trim().toLowerCase() : "";

    if (href && href.startsWith("http")) {
      try {
        const fullUrl = new URL(href, window.location.href).href;

        if (fullUrl === window.location.href + "#") {
          console.log(
            `[contentScript] Skipping anchor link on current page: ${href}`
          );
          return;
        }
        if (fullUrl === window.location.href) {
          console.log(`[contentScript] Skipping link to current page: ${href}`);
          return;
        }

        if (
          keywords.some(
            (keyword) => text.includes(keyword) || fullUrl.includes(keyword)
          )
        ) {
          if (!foundLinks.has(fullUrl)) {
            foundLinks.set(fullUrl, {
              url: fullUrl,
              text: link.textContent.trim(),
            });
            console.log(
              `[contentScript] Identified potential legal link: ${fullUrl} (Text: "${link.textContent.trim()}")`
            );
          }
        }
      } catch (e) {
        console.warn(
          "[contentScript] Invalid URL found or error parsing:",
          href,
          e
        );
      }
    }
  });

  const finalLinks = Array.from(foundLinks.values());
  console.log(
    `[contentScript] Final list of unique legal links to analyze: ${finalLinks.length}`
  );
  return finalLinks;
}

// --- Function to display the summary bar (UPDATED WITH YOUR TEAMMATE'S STYLING) ---
function displaySummaryBar(summary, criticalPoints) {
  console.log("[contentScript] Attempting to display summary bar...");
  let summaryBar = document.getElementById("terms-demystifier-summary-bar");
  if (!summaryBar) {
    summaryBar = document.createElement("div");
    summaryBar.id = "terms-demystifier-summary-bar";

    // --- YOUR TEAMMATE'S STYLING INTEGRATED HERE ---
    Object.assign(summaryBar.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "2147483646",
      backgroundColor: "#000000ff",
      borderRadius: "8px", // rounded corners
      borderBottom: "1px solid #ccc", // Changed from borderBottom only for consistent look
      padding: "15px", // Slightly more padding for better look
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)", // More prominent shadow
      maxHeight: "50vh", // Prevent summary bar from taking whole screen on long lists
      overflowY: "auto",
      color: "#333",
      fontFamily: "Arial, sans-serif",
      width: "350px", // set a fixed width, slightly wider for content
      boxSizing: "border-box", // Include padding in the width
    });
    document.body.prepend(summaryBar); // Add to the top of the body
  }

  let pointsHtml = criticalPoints
    .map((p) => {
      let color;
      switch ((p.risk_level || "NEUTRAL").toUpperCase()) {
        case "HIGH":
          color = "#d9534f";
          break; // Red
        case "MEDIUM":
          color = "#f0ad4e";
          break; // Orange
        case "LOW":
          color = "#5cb85c";
          break; // Green
        default:
          color = "#5bc0de"; // Blue (for neutral/info)
      }
      return `            <li style="color:${color}; margin-bottom: 8px;">
                <strong>${p.category || "Point"}:</strong> ${p.explanation}
                <br><small><em>(Risk: ${p.risk_level || "Neutral"})</em></small>
                ${
                  p.original_snippet
                    ? `<br><small style="color: #666;">Original: "${p.original_snippet
                        .substring(0, 150)
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}..."</small>`
                    : ""
                }
            </li>
       `;
    })
    .join("");

  summaryBar.innerHTML = `        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #333;">Terms Demystifier Summary</h3>
            <button id="closeSummaryBar" style="background: none; border: none; font-size: 1.8em; cursor: pointer; color: #555;">&times;</button>
        </div>
        <p style="margin-bottom: 15px;">${summary}</p>
        <h4 style="margin-top: 15px; color: #333;">Critical Points:</h4>
        <ul style="list-style-type: none; padding: 0;">${pointsHtml}</ul>
   `;

  document.getElementById("closeSummaryBar").addEventListener("click", () => {
    summaryBar.remove();
    console.log("[contentScript] Summary bar closed.");
  });
  console.log("[contentScript] Summary bar displayed.");
}

function displayErrorMessage(message) {
  console.log("[contentScript] Attempting to display error message:", message);
  let errorBar = document.getElementById("terms-demystifier-error-bar");
  if (!errorBar) {
    errorBar = document.createElement("div");
    errorBar.id = "terms-demystifier-error-bar";
    Object.assign(errorBar.style, {
      position: "fixed", // Position fixed relative to viewport
      top: "20px", // 20px from the top
      right: "20px", // 20px from the right
      zIndex: "2147483646",
      backgroundColor: "#000000ff",
      color: "#a94442",
      padding: "10px",
      textAlign: "center",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      fontFamily: "Arial, sans-serif",
      width: "300px", // Fixed width, same as the summary bar
      borderRadius: "8px", // Consistent rounded corners
      boxSizing: "border-box", // Include padding in the width
    });
    document.body.prepend(errorBar);
    setTimeout(() => {
      errorBar.remove();
      console.log("[contentScript] Error bar removed.");
    }, 7000); // Remove after 7 seconds
  }
  errorBar.textContent = `Error: ${message}`;
}

// --- Listen for messages from the background script ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(
    "[contentScript] Received message from background:",
    message.action
  );
  if (message.action === "extractPageText") {
    const legalText = extractLegalText();
    chrome.runtime.sendMessage({
      action: "legalTextExtracted",
      text: legalText,
      url: window.location.href,
    });
    return true;
  } else if (message.action === "findLegalLinks") {
    const links = findLegalLinks();
    console.log(
      `[contentScript] Sending ${links.length} links back to background.js.`
    );
    chrome.runtime.sendMessage({
      action: "legalLinksFound",
      links: links,
    });
    return true;
  } else if (message.action === "displaySummary") {
    console.log("[contentScript] Received displaySummary message:", message);
    displaySummaryBar(message.summary, message.critical_points);
    return true;
  } else if (message.action === "displayError") {
    displayErrorMessage(message.message);
    return true;
  }
});
