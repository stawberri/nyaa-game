/*
** Defines characters
** Runs third during initialization
*/

angular.module('game-characters', ['data', 'metaLoading'])
  .run(['$rootScope', 'metaLoading', 'data', function($rootScope, metaLoading, data) {
    var scopeOn = $rootScope.$on('game.data.avsCreated', function() {
      scopeOn();

      var doneWithThis = metaLoading.add('Processing character data');

      data.char({
        // Default configuration (not data structure!)
      });

      data.char('player', {
        // Default confiration for player
      })

      data.char('catgirl', {
        // Default confiration for catgirl
      })

      doneWithThis();
      $rootScope.$emit('game.start');
    });
  }])
