chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "memeify-selection",
    title: "Meme-ify this selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "memeify-selection") {
    chrome.storage.local.set({ selectedText: info.selectionText }, () => {
      chrome.sidePanel.open({ windowId: tab.windowId });
    });
  }
});