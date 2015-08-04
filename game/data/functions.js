angular.module('game-functions', [])
  .run([
    'routeViewModifier',
    function(routeViewModifier) {
      routeViewModifier('func', {
        printDateString: function() {
          return new Date().toISOString();
        }
      });
    }
  ])
