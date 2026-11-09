// Chrome skips the activeTab grant when setPanelBehavior({ openPanelOnActionClick })
// opens the panel, so the click opens it here, after the grant.
// Firefox has no sidePanel and only opens its sidebar straight from the click.
chrome.action.onClicked.addListener(tab => {
  if (chrome.sidePanel) chrome.sidePanel.open({ windowId: tab.windowId });
  else browser.sidebarAction.open();
  chrome.runtime.sendMessage({ type: 'hook', tabId: tab.id, windowId: tab.windowId }).catch(() => {});
});
