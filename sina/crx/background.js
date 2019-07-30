chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.executeScript(null, {file: 'jquery-3.3.1.min.js'}, () => {
    chrome.tabs.executeScript(null, {file: 'md5.js'}, () => {
      chrome.tabs.executeScript(null, {file: 'contentScript.js'});
    });
  });
});
console.log('added');
