/*
** Data update script
** Runs first during initialization
*/

angular.module('game-update', ['data', 'metaLoading'])
  .run(['$rootScope', 'data', 'metaLoading', function($rootScope, data, metaLoading) {
    var scopeOn = $rootScope.$on('data.updateData', function() {
      scopeOn();

      var updateComplete = metaLoading.add('Updating save data');
      var dataVersion = data.version();
      var updating = false;

      // Initial setup
      // >> Current Version <<
      if(updating = updating || dataVersion.compare('0.2.2.6') == -1) {
      }

      // Update to current version even if no update code occurred for this version.
      if(updating = updating || dataVersion.compare(pudding.config.version) == -1) {
        data.$[pudding.$.ver] = new pudding.Version(pudding.config.version).string;
        data.$set();
      }

      updateComplete();
      data.$ready = true;
      $rootScope.$emit('game.data.updateComplete');
    });
  }]);
