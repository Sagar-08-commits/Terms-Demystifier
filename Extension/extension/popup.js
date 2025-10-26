document.addEventListener("DOMContentLoaded", () => {
  const analyzeCurrentButton = document.getElementById("analyzeCurrentButton");
  const analyzeLinkedButton = document.getElementById("analyzeLinkedButton");
  const statusDiv = document.getElementById("status");

  const setButtonsState = (disabled) => {
    analyzeCurrentButton.disabled = disabled;
    analyzeLinkedButton.disabled = disabled;
  };

  const handleClick = async (actionType) => {
    statusDiv.textContent = "Analyzing... This may take a moment.";
    setButtonsState(true); // Disable both buttons

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.id) {
      // Send a message to the background script.
      // The background script will now handle ALL auth.
      chrome.runtime.sendMessage({
        action: actionType, // "analyzeCurrentPage" or "findAndAnalyzeLinked"
        tabId: tab.id,
      });
    } else {
      statusDiv.textContent = "No active tab found.";
      setButtonsState(false); // Re-enable buttons
    }
  };

  analyzeCurrentButton.addEventListener("click", () =>
    handleClick("analyzeCurrentPage")
  );
  analyzeLinkedButton.addEventListener("click", () =>
    handleClick("findAndAnalyzeLinked")
  );

  // Listen for messages from the background script (e.g., analysis complete)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.action === "analysisComplete" ||
      message.action === "analysisError"
    ) {
      statusDiv.textContent = message.message;
      setButtonsState(false); // Re-enable buttons
    }
  });
});
