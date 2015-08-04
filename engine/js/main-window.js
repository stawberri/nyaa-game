/*
** Performs final processing and critical functionality, then links to webpage.
*/

angular.module('~', [
  'app', 'data', 'utility', 'metaLoading', 'tooltip', 'ngSanitize', 'game', 'session'
])
  // Load data from config.js, and then switches debug info off if necessary.
  .config(['$provide', '$compileProvider', function($provide, $compileProvider) {
    $provide.constant('puddingConfig', pudding.config)
    $compileProvider.debugInfoEnabled(pudding.config.debug)
  }])
  // Create main app-wide controller, containing 'app' and 'data' services.
  .controller('~', [
    '$scope', 'app', 'data', 'metaLoading', 'session', 'view',
    function($scope, app, data, metaLoading, session, view) {
      // This provides access to this scope
      app.scope = $scope;
      // This provides access to javascript objects
      $scope.pudding = pudding;
      // Data lasts the longest and is saved (game and program) data
      $scope.data = data;
      // This is a service generally used to read data about the program state
      $scope.app = app;
      // This contains data that lasts for one run of the program, used to set up the view
      $scope.session = session;
      // This lasts for the duration of a dialogue box (it's actually used to store its scope)
      $scope.view = view;
    }
  ])

// Native handler for closing app.
document.getElementById('app-meta-close').onclick = function() {
  chrome.app.window.current().close();
  return false;
};

// Native handler for minimizing app.
document.getElementById('app-meta-minimize').onclick = function() {
  chrome.app.window.current().minimize();
  return false;
};

