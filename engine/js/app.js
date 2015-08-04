/*
** Sets up 'app' service, which manages and reveals overall window data.
*/

angular.module('app', [])
  .factory('app', [
    '$rootScope', '$window', 'puddingConfig',
    function($rootScope, $window, puddingConfig) {
      var app = {
        // This changes the name displayed in the header. Only designed to be 'Nyaa'
        name: 'Nyaa',
        // Changes the tilde in the header. Very few characters actually look good.
        tilde: '~',
        // Changes header (titlebar) title.
        title: '',
        // This combines the title together into a titlebar type thing.
        fullTitle: function() {
            if(app.name.length > 0) {
              if(app.title.length > 0) {
                // Both values exist.
                return app.name + app.tilde + ' ' + app.title;
              } else {
                // Only app name exists.
                return app.name + app.tilde;
              }
            } else {
              if(app.title.length > 0) {
                // Only app title exists.
                return app.title;
              } else {
                // Neither exists.
                return '';
              }
            }
          },


        // Main interface text color.
        titlebarColorColor: '253, 238, 0', // #fdee00
        titlebarColor: function(opacity) {
          if(opacity || opacity === 0) {
            return 'rgba(' + app.titlebarColorColor + ', ' + opacity + ')';
          } else {
            return 'rgb(' + app.titlebarColorColor + ')';
          }
        },
        // This changes the main interface background color. Generally leave this at default.
        titlebarBackgroundColor: '61, 43, 31', // #3d2b1f
        // This formats it into a background color with opacity
        titlebarBackground: function(opacity) {
          if(opacity) {
            return 'rgba(' + app.titlebarBackgroundColor + ', ' + opacity + ')';
          } else {
            return 'rgb(' + app.titlebarBackgroundColor + ')';
          }
        },
        // This is a css rule that helps set the titlebar background animation property, to make it easier to edit.
        titlebarTransition: function() {
          var args = [].slice.call(arguments);

          args.forEach(function(value, key, array) {
            array[key] += ' 1s';
          });

          return args.join(', ');
        },

        // This contains the aspect ratio. Will need to become a function once it's unlocked.
        aspectRatio: $window.innerWidth/$window.innerHeight,

        // Hides (and unhides) ui
        uiHide: function(onlyHide) {
          var body = angular.element(document.body);

          if(onlyHide) {
            // Pass a negative value to only show
            if(onlyHide < 0) {
              if(!body.hasClass('app-ui-hide')) return;
            } else {
              if(body.hasClass('app-ui-hide')) return;
            }
          }

          body.triggerHandler('contextmenu');
        },
        // Clicks close button.
        close: function() {
          document.getElementById('app-meta-close').click();
        },
        // Clicks minimize button.
        minimize: function() {
          document.getElementById('app-meta-minimize').click();
        },

        // Gets the current window (chrome AppWindow object)
        window: chrome.app.window.current(),


        // app.$ is the primary 'debug mode' variable.
        $: puddingConfig.debug,
        // This disables parallax.
        parallaxOff: false,
        // This is only used for the debug mode toggle, and should never be used otherwise.
        debuggable: puddingConfig.debug
      };

      // Mouse data
      var setMouseData = function(event) {
        mouse = {};

        // Pixel position
        if(!event || app.parallaxOff) {
          mouse.x = {x: $window.innerWidth/2};
          mouse.y = {y: $window.innerHeight/2};
          mouse.yc = {y: $window.innerHeight/2};
        } else {
          // Make sure values stay within window range.
          mouse.x = {x: pudding.limitRange(0, event.pageX, $window.innerWidth)};
          mouse.y = {y: pudding.limitRange(0, event.pageY, $window.innerHeight)};
          mouse.yc = {y: pudding.limitRange(0, event.pageY, $window.innerHeight)};
        }

        // Percentage (float)
        mouse.x.f = mouse.x.x / $window.innerWidth;
        mouse.y.f = mouse.y.y / $window.innerHeight;
        mouse.yc.f = mouse.y.f / app.aspectRatio;

        // 1 - percentage
        mouse.x.fn = 1 - mouse.x.f;
        mouse.y.fn = 1 - mouse.y.f;
        mouse.yc.fn = mouse.y.fn / app.aspectRatio;

        // Centered
        mouse.x.c = mouse.x.x - ($window.innerWidth / 2);
        mouse.y.c = mouse.y.y - ($window.innerHeight / 2);
        mouse.yc.c = mouse.y.c / app.aspectRatio;

        mouse.x.fc = mouse.x.f - 0.5;
        mouse.y.fc = mouse.y.f - 0.5;
        mouse.yc.fc = mouse.y.fc / app.aspectRatio;

        mouse.x.fnc = mouse.x.fn - 0.5;
        mouse.y.fnc = mouse.y.fn - 0.5;
        mouse.yc.fnc = mouse.y.fnc / app.aspectRatio;

        // Set it
        app.mouse = mouse;
      }
      setMouseData();

      angular.element($window).on('mousemove', function(event) {
        $rootScope.$apply(function() {
          setMouseData(event);
        });
      });

      return app;
    }
  ]);
