/*
** General utility classes and functions
*/

// Run a function once
// Copied from underscore
pudding.once = function(func) {
  var ran, memo;
  return function() {
    if(ran) return memo;
    ran = true;
    memo = func.apply(this, arguments);
    func = null;
    return memo;
  };
};

// Turn angular.element().on into a cancel function returning thing
pudding.onoff = function(element) {
  var args = [].slice.call(arguments);
  var elem = angular.element(args.shift());
  elem.on.apply(elem, args);

  return pudding.once(function() {
    elem.off(args[0], args[args.length - 1]);
  });
}

// Destroy a object when element is destroyed
pudding.alsoDestroy = function(element, also) {
  element.one('$destroy', function() {
    also.$destroy();
  });
}

// Run a function on a transcluded element instead of the original one
pudding.transcludeify = function(element, transclude, func) {
  var transcludedScope;
  var transcluded;

  transclude(function(clone, cScope) {
    transcluded = clone;
    transcludedScope = cScope;

    pudding.alsoDestroy(clone, cScope);

    func(clone);
  });

  element.one('$destroy', function() {
    transcludedScope.$destroy();
    transcluded.triggerHandler('$destroy');
    transcluded = null;
  })
}

// Limit a value into a range
pudding.limitRange = function(min, value, max) {
  return Math.min(Math.max(Math.min(min, max), value), Math.max(min, max));
}

// compare a value (middle value) with a range (ends inclusive)
pudding.compareRange = function(min, value, max) {
  if(value < Math.min(min, max)) return -1;
  if(value > Math.max(min, max)) return 1;
  return 0;
}

// Version
  pudding.Version = function(version) {
    switch(typeof version) {
      case 'string':
        this.string = version;
        this.data = this.string.split('.');
      break;

      case 'number':
        this.string = String(version);
        this.data = this.string.split('.');
      break;

      default:
        this.string = version.string;
        this.data = version.data;
      break;
    }
  }
  // Returns 1 if this version is greater, -1 if this version is less, and 0 if they're equal.
  pudding.Version.prototype = {
    compare: function(otherVersion) {
      if(typeof otherVersion === 'string') {
        // Convert version string to a version.
        otherVersion = new pudding.Version(otherVersion);
      }
      var minLength = Math.min(otherVersion.data.length, this.data.length)
      for(var i = 0; i < minLength; i++) {
        if(parseInt(this.data[i]) > parseInt(otherVersion.data[i])) {
          return 1;
        } else if(parseInt(this.data[i]) < parseInt(otherVersion.data[i])) {
          return -1;
        }
      }

      if(this.data.length > otherVersion.data.length) {
        return 1;
      } else if(this.data.length < otherVersion.data.length) {
        return -1;
      }

      return 0;
    }
  }

// Stupidly complicated adding to object behavior
// $parse is from angular. object is object to be edited.
// Path is the key / path inside object to access.
// Value is the value already prepared for insertion (preparse this)
// Add only has an effect when parse is an object, and adds value.
pudding.editObjectWithParse = function($parse, object, path, value, add) {
  var item = $parse(path);
  var setItem = item.assign;
  var currentItem = item(object);

  if(add && typeof currentItem === 'object') {
    if(Array.isArray(currentItem)) {
      // If we currently have an array, then the value to be added to the array is expected.
      currentItem.push(value);
    } else {
      // If we have an object, pass in another object to be merged.
      angular.extend(currentItem, value);
    }
    return;
  }

  // Since we're not adding it's quite simple:
  setItem(object, value);
}
