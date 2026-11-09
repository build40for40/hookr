// Chrome skips the activeTab grant when setPanelBehavior({ openPanelOnActionClick })
// opens the panel, so the click opens it here, after the grant.
chrome.action.onClicked.addListener(tab => {
  chrome.sidePanel.open({ windowId: tab.windowId });
  chrome.runtime.sendMessage({ type: 'hook', tabId: tab.id, windowId: tab.windowId }).catch(() => {});
});
