const POPUP_WINDOW_WIDTH = 400;
const POPUP_WINDOW_HEIGHT = 600;

browser.browserAction.onClicked.addListener(() => {
  browser.windows.create({
    url: browser.runtime.getURL("popup.html"),
    type: "popup",
    width: POPUP_WINDOW_WIDTH,
    height: POPUP_WINDOW_HEIGHT
  });
});
