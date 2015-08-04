/*
** Tooltip display engine
*/

angular.module('tooltip', [])
  // This service manages tooltips
  .factory('tooltip', [function() {
    var mouseStack = [];
    var tooltip = {
      mouse: {
        $: false,
        transclude: null,
        clas: '',
        scope: {},
        set: function(transclude, clas) {
          var data = [transclude, clas];
          mouseStack.push(data);
          tooltip.mouse.transclude = transclude;
          tooltip.mouse.clas = clas;
          tooltip.mouse.$ = true;
          // Return a remover function
          return pudding.once(function() {
            mouseStack.splice(mouseStack.indexOf(data), 1);
            if(mouseStack.length < 1) {
              tooltip.mouse.$ = false;
              tooltip.mouse.transclude = null;
              tooltip.mouse.clas = '';
            } else {
              var data = mouseStack[mouseStack.length - 1];
              tooltip.mouse.transclude = data[0];
              tooltip.mouse.clas = data[1];
            }
          });
        }
      }
    };
    return tooltip;
  }])
  // This is a convenience directive that creates tooltips
  .directive('pdTooltip', [function() {
    return {
      restrict: "A",

      compile: function(tElement, tAttrs) {
        var tooltip = angular.element('<pd-mouse-tooltip>');
        tooltip.html(tAttrs.pdTooltip);

        if(tAttrs.title) {
          tooltip.prepend(
            angular.element('<h1>' + tAttrs.title + '</h1>')
          );

          delete tAttrs.title;
          tElement.removeAttr('title');
        }

        if(tAttrs.pdTooltipClass) {
          tooltip.attr('class', tAttrs.pdTooltipClass);

          delete tAttrs.pdTooltipClass;
          tElement.removeAttr('pd-tooltip-class');
        }

        // Remove tooltip attribute
        delete tAttrs.pdTooltip;
        tElement.removeAttr('pd-tooltip');

        // Add it
        tElement.append(tooltip);
      }
    }
  }])
  // This is the directive that gives elements mouse tooltips.
  .directive('pdMouseTooltip', ['tooltip', '$compile', function(tooltip, $compile) {
    return {
      transclude: true,
      link: function(scope, element, attrs, controller, transclude) {
        parent = element.parent();
        element = parent;

        var tooltipRemove = [];
        var tooltipped = 0;

        var mouseEnterEvent = pudding.onoff(parent, 'mouseenter', function() {
          tooltipRemove.push(tooltip.mouse.set(
            transclude,
            attrs.class || '',
            scope
          ));
        });

        var mouseLeaveEvent = pudding.onoff(parent, 'mouseleave', function() {
          if(popped = tooltipRemove.pop()) popped();
        });

        element.one('$destroy', function() {
          angular.forEach(tooltipRemove, function(func) {
            func();
          });
          mouseEnterEvent();
          mouseLeaveEvent();
        });
      }
    };
  }])
  // Finally, this actually displays the tooltips
  .controller('tooltip', ['app', '$window', 'tooltip', function(app, $window, tooltip) {
    this.mouse = tooltip.mouse;
    this.mouseTipCss = function(id) {
      var mouse = app.mouse;

      var css = {
        top: mouse.y.y, left: mouse.x.x
      };

      var adjY = mouse.y.fc / Math.abs(mouse.x.fc);
      var adjX = mouse.x.fc / Math.abs(mouse.y.fc);

      // Which edge are we on?
      if(Math.abs(adjY) > Math.abs(adjX)) {
        if(mouse.y.fc < 0) {
          // Top edge
          css.tY = 0;
        } else {
          // Bottom edge
          css.tY = -100;
        }
        css.tX = -50 - 50 * adjX;
      } else {
        if(mouse.x.fc < 0) {
          // Left edge
          css.tX = 0;
          css.ttX = 100;
        } else {
          // Right edge
          css.tX = -100;
        }
        css.tY = -50 - 50 * adjY;
      }

      // Right in the middle
      if(Number.isNaN(adjY)) css.tY = -50;
      if(Number.isNaN(adjX)) css.tX = -50;

      // Slight adjustments
      css.ttX = -mouse.x.fc * 150;
      css.ttY = -mouse.y.fc * 150;

      // Tilt
      css.rY = mouse.x.fc * 15;
      css.rX = -mouse.y.fc * 25;

      return 'top: ' + css.top + 'px;'
        + 'left: ' + css.left + 'px' + ';'
        + 'transform:'
          + 'translate(' + css.tX + '%, ' + css.tY + '%)'
          + 'translate(' + css.ttX + 'px, ' + css.ttY + 'px)'
          + 'rotateX(' + css.rX + 'deg) rotateY(' + css.rY + 'deg)'
        + ';';
    }
  }]);
