/*
** Defines stuff for the game
** Also starts the game!
*/

angular.module('game', [
  'game-update',
  'game-characters',
  'game-avs',
  'game-functions'
])
  .run([
    '$rootScope', 'app', 'session', 'metaLoading', '$timeout',
    function($rootScope, app, session, metaLoading, $timeout) {
      var scopeOn = $rootScope.$on('game.start', function(event) {
        scopeOn();
        var searchForPage = metaLoading.add('Final preparations');

        var current;
        var routeWatcher = $rootScope.$on('$routeChangeSuccess', function() {
          if(current) $timeout.cancel(current);
          current = $timeout(ready, 100); // Set this higher if page isn't fully loaded when starting
        });

        // Go to initial view
        session.go('~');

        var ready = function() {
          routeWatcher();

          app.titlebarColorColor = '255, 255, 255'; // #fff
          app.titlebarBackgroundColor = '153, 102, 204'; // #9966cc

          searchForPage();
        }
      });
    }
  ]);
