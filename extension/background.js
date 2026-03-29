const API_BASE = "https://human-mode.s-a62.workers.dev";

// Open side panel when toolbar icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// When the side panel opens, update it with the current tab URL
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await chrome.sidePanel.setOptions({
      tabId: activeInfo.tabId,
      path: `sidepanel.html?url=${encodeURIComponent(tab.url)}`,
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: `sidepanel.html?url=${encodeURIComponent(changeInfo.url)}`,
    });
  }
});
