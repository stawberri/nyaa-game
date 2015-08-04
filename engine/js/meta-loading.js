angular.module('metaLoading', ['app'])
  .factory('metaLoading', ['$rootScope', 'app', function($rootScope, app) {
    return metaLoading = {
      tasks: [],
      add: function(task) {
        // Turn task into an object so it can be identified later.
        var saveTask = new Date();
        metaLoading.tasks.push(saveTask);
        // Notify directive.
        $rootScope.$emit('metaLoading.update');
        // Ensure function only works once.
        return pudding.once(function() {
          if(app.$) console.debug('loaded: ' + task + ' (' + (new Date() - saveTask) + 'ms)')
          var index = metaLoading.tasks.indexOf(saveTask);
          if(index != -1) {
            metaLoading.tasks.splice(index, 1);
          }
          $rootScope.$emit('metaLoading.update');
        });
      }
    };
  }])
  .directive('pdMetaLoading', [
    '$rootScope', 'metaLoading', '$timeout', 'app',
    function($rootScope, metaLoading, $timeout, app) {
      var addClassTimeout;
      return {
        link: function(scope, element, attrs) {
          // Introduce a slight delay to setting status to done.
          var setClass = function(addClass) {
            if(addClassTimeout) $timeout.cancel(addClassTimeout);
            if(addClass) {
              addClassTimeout = $timeout(function() {
                element.addClass('done');
              }, 100); // Delay is set here.
            } else {
              element.removeClass('done');
            }
          };

          if(metaLoading.tasks.length == 0) {
              setClass(true);
          }
          var rootOn = $rootScope.$on('metaLoading.update', function(event) {
            if(metaLoading.tasks.length > 0) {
              setClass(false);
            } else {
              setClass(true);
            }
          });
          element.one('$destroy', function() {
            if(addClassTimeout) $timeout.cancel(addClassTimeout);
            rootOn();
          })
        }
      }
    }
  ]);
