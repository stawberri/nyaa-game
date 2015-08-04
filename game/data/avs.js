/*
** Defines avs for characters.
** Runs second during initialization
*/

angular.module('game-avs', ['data', 'metaLoading'])
  .run(['$rootScope', 'metaLoading', 'data', function($rootScope, metaLoading, data) {
    var scopeOn = $rootScope.$on('game.data.updateComplete', function() {
      scopeOn();

      var doneWithThis = metaLoading.add('Defining statistics');

      // These are the functions defining avs for stats (which are pretty big)
      var statAvs = function(avname) {
        return {
          base: function(avObject) {
            if(!avObject) return 0;
            var avInfo = avObject.av(avname).get();
            if(avInfo.mod >= 1) {
              return avInfo.base * avInfo.mod;
            } else {
              return avInfo.base / (2 - avInfo.mod);
            }
          }, callback: function(avObject, newValue, old) {
            if(newValue.mod) {
              var otherAv = avObject.av(avname);
              var avInfo = otherAv.get();
              if(newValue.mod >= avInfo.base) {
                otherAv.mod(newValue.mod / avInfo.base);
              } else if(newValue.mod > 0) {
                otherAv.mod(2 - avInfo.base / newValue.mod)
              } else {
                throw new RangeError(newValue.mod + ' isn\'t a positive value');
              }
              return false;
            }
          }
        };
      };

      // {base, callback(avObject, new, old) -> false to cancel}
      // Callback can modify new value!
      data.av('c', { base: 10 });
      data.av('u', { base: 10 });
      data.av('t', { base: 10 });
      data.av('en', { base: 10 });
      data.av('es', { base: 10 });
      data.av('s', { base: 10 });
      data.av('charisma', statAvs(pudding.$.c));
      data.av('understanding', statAvs(pudding.$.u));
      data.av('toughness', statAvs(pudding.$.t));
      data.av('energy', statAvs(pudding.$.en));
      data.av('essence', statAvs(pudding.$.es));
      data.av('strength', statAvs(pudding.$.s));

      doneWithThis();
      $rootScope.$emit('game.data.avsCreated');
    });
  }])
