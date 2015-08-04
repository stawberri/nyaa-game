/*
** Some utility stuff for convenience.
*/

angular.module('utility', [])
  // Right click to hide ui
  .directive('pdUiHide', ['app', function(app) {
    return {
      link: function(scope, element, attrs) {
        var uiShow = function(event) {
            event.preventDefault();
            element.off('contextmenu', uiShow);
            element.off('click', uiShow);
            element.removeClass('app-ui-hide');
            element.on('contextmenu', uiHide);
        }

        var uiHide = function(event, override) {
          if(!app.$ || override) {
            event.preventDefault();
            element.off('contextmenu', uiHide);
            element.addClass('app-ui-hide');
            element.on('contextmenu', uiShow);
            element.on('click', uiShow);
          }
        }

        element.on('contextmenu', uiHide);

        element.one('$destroy', function() {
          element.off('contextmenu', uiHide);
          element.off('contextmenu', uiShow);
          element.off('click', uiShow);
        })
      }
    }
  }])
  // Get a unique css selector for an element
  .factory('cssSelector', [function() {
    var elementCount = 0;
    return function(element) {
      element = angular.element(element);
      elementAttr = element.attr('pd-unique-selector');
      if(!elementAttr) {
        elementAttr = 'element' + String(elementCount++);
        element.attr('pd-unique-selector', elementAttr);
      }
      return '[pd-unique-selector=' + elementAttr + ']';
    };
    }])
  // Create a style element with some improvements
  .directive('pdStyle', ['cssSelector', function(cssSelector) {
    return {
      scope: true,
      link: function(scope, element, attrs) {
        scope.style = {
          // Containing element's selector
          $: cssSelector(element.parent())
        }
      }
    }
  }])
  // Evaluates an expression, compiles it, and then puts it into the element
  .directive('pdCompileHtml', ['$sce', '$parse', '$compile', function($sce, $parse, $compile) {
    return {
      restrict: 'A',
      compile: function (tElement, tAttrs) {
        var compileAttribute = $parse(tAttrs.pdCompileHtml);
        var compileScope = $parse(tAttrs.pdCompileHtmlScope);
        return function(scope, element, attr) {
          scope.$watch(function() {
            var attribute = compileAttribute(scope);
            var otherScope = compileScope(scope);
            otherScope = otherScope && otherScope.$id;
            return [attribute, otherScope];
          }, function() {
            var useScope = compileScope(scope) || scope;
            element.html(compileAttribute(scope));

            // Added elements don't automatically compile themselves for some reason.
            $compile(element.contents())(useScope);
          }, true);
        };
      }
    };
  }])
  // Accepts a variable that evaluates to a transclude function
  .directive('pdTransclude', ['$parse', function($parse) {
    return {
      link: function(scope, element, attr) {
        var attrParser = $parse(attr.pdTransclude);
        var transcluded, transcludedScope;

        scope.$watch(function() {
          return attrParser(scope);
        }, function() {
          if(transcluded) {
            transcluded.remove();
            transcludedScope.$destroy();
            transcluded = null;
          }

          var transclude = attrParser(scope);
          if(typeof transclude === 'function') {
            element.empty().append(
              transclude(function(clone, cScope) {
                transcluded = clone;
                transcludedScope = cScope;

                pudding.alsoDestroy(clone, cScope);

                transcluded = clone;
              })
            );
          }
        });
      }
    }
  }])
  // Automaticaly clicks on an element when it's linked! Great for redirects.
  .directive('pdAutoClick', ['$timeout', function($timeout) {
    return {
      link: function(scope, element, attrs) {
        // Wait a teeny bit before clicking, to prevent collisions.
        $timeout(function() {
          element[0].click();
        });
      }
    }
  }])
  // Generate a transclude function
  .directive('pdTranscludable', ['$parse', function($parse) {
      return {
        priority: 9000,
        transclude: 'element',
        link: function(scope, element, attrs, controller, transclude) {
          $parse(attrs.pdTranscludable).assign(scope, transclude);
        }
      };
  }]);
