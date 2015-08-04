/*
** Sets up session service and manages routes.
*/
angular.module('session', ['app', 'data', 'ngRoute'])
  .factory('session', [
    'app', 'data', '$location', '$route', 'view',
    function(app, data, $location, $route, view) {
      var session = {
        // Method to go to a route
        go: function(route) {
          $location.url(route || '');
        },
        reload: function(route) {
          $route.reload();
        },

        // Array of backgrounds, in order from back to front (html element order)
        backgrounds: [],

        // Menus appearing behind character. Only supports one menu per side for now.
        menuBehind: {left: '', right: ''},

        // I don't even know how I'll implement this.
        characters: [],

        // Array of foregrounds, in order from back to front (html element order)
        backgrounds: [],

        // This is the history, and should be already rendered, with necessary sanitation applied
        dialogueHistory: []
      };

      return session;
    }
  ])
  // This is weird, but it's a factory used to add functions to route
  .factory('routeViewModifier', [function() {
    var data = {};

    return function(key, value) {
      if(key) {
        data[key] = value;
      } else {
        return data;
      }
    }
  }])
  // Controller for processor view, to give it some shortcut thingies
  .controller('route-view-controller', [
    '$scope', '$routeParams', 'routeViewModifier',
    function($scope, $routeParams, routeViewModifier) {
      $scope.route = routeViewModifier();

      angular.extend($scope.route, {
        // Character quick access functions (like skyrim)
        player: function() {
          return data.char(pudding.$.player);
        },
        catgirl: function() {
          return data.char(pudding.$.catgirl);
        },

        // Some easier to remember / type paths (also makes moving folders around eaiser)
        $: {
          $: 'game/route',
          bg: 'game/bg',
          ui: {
            root: 'game/ui',
            behind: 'game/ui/menu-behind'
          }
        },

        // Make routeparams accessible
        params: $routeParams
      });
    }
  ])
  // Create a new view service for sending extremely temporary data
  .factory('view', ['$rootScope', function($rootScope) {
    var data = {};

    $rootScope.$on('view.factory.make.empty', function() {
      angular.forEach(data, function(value, key) {
        delete data[key];
      })
    })

    return data;
  }])
  // Set up route stuff
  .config([
    '$provide', '$routeProvider', '$locationProvider',
    function($provide, $routeProvider, $locationProvider) {
      $locationProvider.html5Mode(true);

      // To link to /game/route/name-of-file.html: '#name-of-file'
      $routeProvider
        // Just don't do anything when it's empty.
        .when('/', {})
        .when('/:path*', {
          controller: 'route-view-controller',
          templateUrl: function(parameters) {
            return 'game/route/' + parameters.path + '.html';
          }
        });
    }
  ])
  // More route stuff setup
  .run([
    'session', '$rootScope', 'app',
    function(session, $rootScope, app) {
      // Clear url so it doesn't try to figure out where index.html.html is
      session.go();

      // Log route changes to console
      $rootScope.$on('$routeChangeSuccess', function(event, next) {
        if(app.$ && next.params.path) console.debug('route: ' + next.params.path);
      });
    }
  ])
  // Session directive - modifies stuff inside of session.
  .directive('pdSession', ['$parse', 'session', function($parse, session) {
    return {
      restrict: 'E',
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        pudding.transcludeify(element, transclude, function(clone) {
          scope.$watch(function() {
            return [(attrs.pdSet || attrs.pdAdd), clone.html()];
          }, function() {
            // There's nothing to do if there isn't an add attribute at this point
            if(!(attrs.pdSet || attrs.pdAdd)) throw new ReferenceError('Missing variable to set in session.');

            pudding.editObjectWithParse(
              $parse,
              session,
              attrs.pdSet || attrs.pdAdd,
              $parse(clone.html())(scope),
              !attrs.pdSet
            );
          }, true);
        });
      }
    };
  }])
  // Data directive - Modifes data.data()
  .directive('pdData', ['$parse', 'data', function($parse, data) {
    return {
      restrict: 'E',
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        // There's nothing to do if there isn't a key attribute at this point
        if(!attrs.pdKey) throw new ReferenceError('Missing data key.');

        pudding.transcludeify(element, transclude, function(clone) {
          scope.$watch(function() {
            return [attrs.pdKey, (attrs.pdSet || attrs.pdAdd), clone.html()];
          }, function() {
            var contents = $parse(clone.html())(scope);
            var myData = {data: data.data(attrs.pdKey)};

            if(attrs.pdSet || attrs.pdAdd) {
              if(typeof myData.data !== 'object') throw TypeError(attrs.pdKey + ' is not an object.');

              // Create an item name, then add data in front of it.
              var itemName = attrs.pdSet || attrs.pdAdd;
              if(itemName.charAt(0) != '.' && itemName.charAt(0) != '[') itemName = '.' + itemName;
              itemName = 'data' + itemName;

              pudding.editObjectWithParse(
                $parse,
                myData,
                itemName,
                contents,
                !attrs.pdSet
              );
            } else if(typeof attrs.pdSet === 'undefined' && typeof attrs.pdAdd !== 'undefined') {
              if(typeof myData.data !== 'object') throw TypeError(attrs.pdKey + ' is not an object.');

              // Create an item name
              var itemName = 'data';

              pudding.editObjectWithParse(
                $parse,
                myData,
                itemName,
                contents,
                true
              );
            } else {
              // Just set the data
              data.data(attrs.pdKey, contents);
            }
          }, true);
        });
      }
    };
  }])
  // Session D(ialogue) directive - creates a session dialogue directive in a longer lasting scope
  .directive('pdD', [
    'app', '$compile', '$rootScope', 'view', 'session', '$routeParams',
    function(app, $compile, $rootScope, view, session, $routeParams) {
      return {
        priority: 3000,
        restrict: 'E',
        compile: function(tElement, tAttrs) {
          // Grab html and then remove everything
          var tHtml = tElement[0].outerHTML;
          tElement.remove();
          tAttrs.length = 0;

          // Was there an existing one?
          if(view.$) {
            // Do nothing if path is the same.
            if(view.$.path == $routeParams.path) return;

            // If it was rendered, save it.
            if(view.$.rendered) {
              var rendered = view.$.rendered;
              rendered = rendered.replace(/href=(['"]).*?\1/g, 'href=$1$1');
              rendered = rendered.replace(/(pd|ng)-([\w-]+)=(['"]).*?\3/g, '');
              rendered = rendered.replace(/<!--.*?-->/g, '');
              rendered = rendered.replace(/\s+/g, ' ');
              rendered = rendered.replace(/( ?> ?)/g, '>');
              rendered = rendered.replace(/( ?< ?)/g, '<');
              rendered = rendered.replace(/(<a.*?href="".*?><\/a>)/g, '');
              rendered = rendered.replace(/(<pd-redirect.*?><\/pd-redirect>)/g, '');
              session.dialogueHistory.push({
                path: view.$.path,
                rendered: rendered
              });
            }
            if(app.$) {console.debug('history: ' + view.$.path)}

            // Finally, actually destroy it.
            view.$.$destroy();
          }
          // Clear view variable
          $rootScope.$emit('view.factory.make.empty');
          // Create new scope
          view.$ = app.scope.$new();
          // Set some stuff
          view.$.path = $routeParams.path;
          // Edit html
          view.$.html = tHtml.replace(/<pd-d(.*?)>/ig, '<pd-d$1 pd-transcludable="view.$.transclude">');
          // Compile it
          view.$.element = $compile(view.$.html)(view.$);
          // Set up the element to get a destroy event when the scope is destroyed
          var onDestroy = view.$.$on('$destroy', function() {
            onDestroy();

            view.$.element.triggerHandler('$destroy');
          })
        }
      };
    }
  ])
  // Session Dialogue Update Render directive - put this on the element that receives the dialogue to save its renders
  .directive('pdSessionDialogueRender', ['session', 'view', function(session, view) {
    return {
      link: function(scope, element, attrs) {
        scope.$watch(function() {
          return element.html();
        }, function() {
          if(view.$) view.$.rendered = element.html();
        })
      }
    }
  }])
  // Title directive - edits the window's title
  .directive('pdAppTitle', ['app', function(app) {
    return {
      restrict: 'E',
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        pudding.transcludeify(element, transclude, function(clone) {
          scope.$watch(function() {
            return clone.html();
          }, function() {
            app.title = clone.html();
          });
        })
      }
    }
  }])
  // Forceupdate Directive -- forces an update every interval
  .directive('pdForceUpdate', ['$timeout', function($timeout) {
    return {
      restrict: 'E',
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        pudding.transcludeify(element, transclude, function(clone) {
          var timeout = null;
          var makeTimeout = function() {
            timeout = $timeout(makeTimeout, parseFloat(clone.html()));
          }
          makeTimeout();

          clone.one('$destroy', function() {
            if(timeout) $timeout.cancel(timeout);
          })
        });
      }
    };
  }])
  // Redirect to a route
  .directive('pdRedirect', ['session', function(session) {
    return {
      restrict: 'E',
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        pudding.transcludeify(element, transclude, function(clone) {
          scope.$watch(function() {
            return clone.html();
          }, function() {
            session.go(clone.html());
          });
        });
      }
    }
  }]);
