/*
** Doesn't really do anything except create a window at the moment.
*/

chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('/index.html', {
    'id': 'nyaa',
    'bounds': {
      'width': 1280,
      'height': 720
    },
    'frame': 'none',
    'resizable': false
  });
});
