/*
** Sets up 'data' service, which contains all of the game data stored in local storage.
*/

angular.module('data', ['metaLoading'])
  .factory('data', [
    'puddingConfig', 'metaLoading', '$timeout', '$rootScope', 'app', '$parse',
    function(puddingConfig, metaLoading, $timeout, $rootScope, app, $parse) {
      var finishDataInitialLoad = metaLoading.add('Loading save data');
      var dataName = pudding.config.saveName;
      var setTimeout = null;
      var setSyncTimeout = null;
      var setFunctions = [];

      // Helper function to parse a key from
      var keyParse = function(key) {
        var parsedKey = $parse(key)(pudding.$);
        if(typeof parsedKey === 'undefined') throw new ReferenceError(key + ' is not a valid pudding.$ name');

        return parsedKey;
      }

      // Basic data functions
        var data = {
          // Set this to true inside of update script
          // This means that the data can be considered properly loaded.
          // Data object itself might not be ready yet.
          $ready: false,
          $get: function(callback) {
            chrome.storage.local.get(dataName, function(getData) {
              chrome.storage.sync.get(dataName, function(getSyncData) {
                // Prefer synced data (if they have the same date)
                loadData(getData);
                loadData(getSyncData);
                // Call callback
                callback(data.$);
              });
            });
          },
          $set: function(callback) {
            data.$[pudding.$.date] = new Date().getTime();
            if(callback) {
              setFunctions.push(callback);
            }

            // Slight delay on saving
            if(setTimeout == null) {
              setTimeout = $timeout(function() {
                setTimeout = null;

                // Check to see if we're trying to save a version greater than this app's version
                if(data.version().compare(pudding.config.version) > 0) {
                  throw new RangeError('Version ' + data.version().string + ' is greater than current version ' + pudding.config.version.string);
                }

                var setData = {};
                setData[dataName] = LZString.compressToUTF16(JSON.stringify(data.$));

                // Add in raw debug data - note that this increases size by 4 bytes
                if(app.$) { setData[dataName + '-raw'] = data.$; }

                chrome.storage.local.set(setData, function() {
                  // Schedule saving to sync data (unless debugging is on)
                  if(setSyncTimeout == null) {
                    setSyncTimeout = $timeout(function() {
                      setSyncTimeout = null;

                      // Delete raw debug data
                      delete setData[dataName + '-raw'];

                      chrome.storage.sync.set(setData);
                    }, 10000);
                  }

                  while(setFunctions.length > 0) {
                    setFunctions.shift()();
                  }
                });
              }, 100)
            }
          }
        }
        // This does data comparison and loading
        var loadData = function(dataObject) {
          $rootScope.$apply(function() {
            data.$ = data.$ || [0];

            if(dataObject[dataName]) {
              newData = JSON.parse(LZString.decompressFromUTF16(dataObject[dataName]));
              // Only keep old data if its date is greater than the new object (equal is replaced as well)
              data.$ = data.$[pudding.$.date] > newData[pudding.$.date] ? data.$ : newData;
            }

            // Fill out missing data storage
            data.$[pudding.$.ver] = data.$[pudding.$.ver] || 0;
            data.$[pudding.$.char] = data.$[pudding.$.char] || [];
            data.$[pudding.$.data] = data.$[pudding.$.data] || {};
            data.$[pudding.$.settings] = data.$[pudding.$.settings] || {};
          });
        }

      // Basic variables
        data.version = function() { return new pudding.Version(data.$[pudding.$.ver]); };
        data.date = function() { return new Date(data.$[pudding.$.date]); };

      // Characters
        // Basic
          // Defaults are never to be edited!
          var charDefaults;
          // These are individual character defaults. The ones above were for everyone.
          var charsDefaults = [];
          data.char = function(index, defaults) {
            if(typeof index === 'object') {
              // Assume index is an object of defaults, to be merged in (not replaced).
              angular.extend(charDefaults = charDefaults || {}, index);
            } else {
              // Edit a character's defaults
              index = keyParse(index);

              angular.extend(charsDefaults[index] = charsDefaults[index] || {}, defaults)
            }
          };
          data.Char = function(index) {
            // Make sure defaults have been defined.
            if(!charDefaults) throw new ReferenceError('Characters are undefined');

            index = keyParse(index);
            if(!charsDefaults[index]) throw new ReferenceError("Character '" + index + "' is undefined")

            // This object stores defaults that are not going to be stored in data.
            // Not in data format -- single-level object read by constructors later
            this.$$ = angular.extend({}, charDefaults, charsDefaults[index]);

            if(!data.$[pudding.$.char][index]) {
              // Empty character data here.
              var newChar = data.$[pudding.$.char][index] = [];
              newChar[pudding.$.av] = {};
              newChar[pudding.$.avmod] = {};
            }
            // This object is the actual data that is stored.
            this.$ = function() { return data.$[pudding.$.char][index]; };

            // av storage array
            this.avs = [];
          }
          data.Char.prototype = {
            av: function(key) {
              var parsedKey = keyParse(key);
              return this.avs[parsedKey] = this.avs[parsedKey] || new data.Av(this, key);
            }
          }
        // avs
          // This stores avs and needs to be filled by game.
          var avs = {};
          // Define one or all avs
          data.av = function(key, properties) {
            if(typeof key === 'object') {
              // Note that this replaces all the avs defined in key.
              angular.extend(avs, key);
            } else {
              key = keyParse(key);
              angular.extend(avs[key] = avs[key] || {}, properties);
            }
          }
          data.Av = function(char, key) {
            // Don't run if parameters aren't available yet
            index = keyParse(key);
            if(!avs[index]) throw new ReferenceError('Av ' + index + ' is undefined')

            // Av's data representation object is its containing character's object, because Avs are primitive values.
            this.char = char;
            this.$ = this.char.$;
            this.key = key;
            this.index = index;
            // Av's defaults object is a copy of the default one, since it'll need to be modified once here.
            // Expected properties: {base: defaultValue, callback: onChange(this, new, old) -> false to cancel}
            this.$$ = angular.copy(avs[index]);

            // Store callback (or an empty function if one doesn't exist)
            this.callback = this.$$.callback || angular.noop;

            // The $$ key means "value of this is in character default"
            // Provide a $ key as well, which will be used if character default can't find it.
            if(typeof this.$$.base === 'object') {
              if(this.$$.base.$$) {
                this.$$.base = this.char.$$[this.$$.base.$$] || this.$$.base.$;
              } else if (this.$$.base.$) {
                // This is provided just in case. If you wrap an object into a $ key, it'll just be used.
                this.$$.base = this.$$.base.$;
              }
            }

            // Store original, as defined by data.
            this.original = angular.copy(this.$$.base);

            // Store base as a function, so that it can change.
            this.base = function() {
              return angular.copy(this.$()[pudding.$.av][this.index] || this.original);
            }

            // Store mod as a function, so that it can change.
            this.getmod = function() {
              return angular.copy(this.$()[pudding.$.avmod][this.index] || this.modOriginal);
            };

            // Some special function processing
            // For this to work, make sure function called with no arguments returns the right type!
            this.baseIsFunction = false;
            var temporaryFunctionProcessorOriginal;
            if(typeof this.original === 'function') {
              this.baseIsFunction = true;
              temporaryFunctionProcessorOriginal = this.original;
              this.original = this.original();
            }

            // Now we figure out how to set mod, mod values, and check for equality.
            this.datatype = typeof this.original;
            switch(typeof this.original) {
              case 'string':
                // Check base is default
                this.isBaseDefault = function(check) { return check === this.original; }
                // Default mod value.
                this.modOriginal = '';
                // Check mod is default
                this.isModDefault = function(check) { return check === this.modOriginal; }
                // Create a function that can generate a base + mod
                this.calculateMod = function() { return this.base() + this.getmod(); }
                // Check for right type
                this.rightType = function(check) { try { String(check); return true; } catch(e) { return false; } }
                // Provide conversion
                this.convertToType = function(value) { return String(value); }
              break;

              case 'number':
                // Check base is default
                this.isBaseDefault = function(check) { return check === this.original; }
                // Default mod value.
                this.modOriginal = 0;
                // Check mod is default
                this.isModDefault = function(check) { return check === this.modOriginal; }
                // Create a function that can generate a base + mod
                this.calculateMod = function() { return this.base() + this.getmod(); }
                // Check for right type
                this.rightType = function(check) { return !Number.isNaN(parseFloat(check)); }
                // Provide conversion
                this.convertToType = function(value) { return parseFloat(value); }
              break;

              case 'boolean':
                // Check base is default
                this.isBaseDefault = function(check) { return check === this.original; }
                // Default mod value.
                this.modOriginal = this.original;
                // Check mod is default
                this.isModDefault = function(check) { return check === this.modOriginal; }
                // Create a function that can generate a base + mod
                this.calculateMod = function() { return this.getmod(); }
                // Check for right type
                this.rightType = function(check) { return typeof !!check === 'boolean'; }
                // Provide conversion
                this.convertToType = function(value) { return !!value; }
              break;

              case 'object':
                if(Array.isArray(this.original)) {
                  // Set datatype name
                  this.datatype = 'array';
                  // Check base is default
                  this.isBaseDefault = function(check) { return angular.equals(check, this.original); }
                  // Default mod value.
                  this.modOriginal = [];
                  // Check mod is default
                  this.isModDefault = function(check) { return angular.equals(check, this.modOriginal); }
                  // Create a function that can generate a base + mod
                  this.calculateMod = function() { return angular.extend({}, this.base(), this.getmod()); }
                  // Check for right type
                  this.rightType = function(check) { return Array.isArray(check); }
                  // Provide conversion
                  this.convertToType = function(value) { return value; }
                } else {
                  // Check base is default
                  this.isBaseDefault = function(check) { return angular.equals(check, this.original); }
                  // Default mod value.
                  this.modOriginal = {};
                  // Check mod is default
                  this.isModDefault = function(check) { return angular.equals(check, this.modOriginal); }
                  // Create a function that can generate a base + mod
                  this.calculateMod = function() { return this.base().concat(this.getmod()); }
                  // Check for right type
                  this.rightType = function(check) { return typeof check === 'object' }
                  // Provide conversion
                  this.convertToType = function(value) { return value; }
                }
              break;

              default:
                // Uhh, either I missed a type or this is undefined.
                // Check base is default
                this.isBaseDefault = function(check) { return true; }
                // Default mod value.
                this.modOriginal = null;
                // Check mod is default
                this.isModDefault = function(check) { return true; }
                // Create a function that can generate a base + mod
                this.calculateMod = function() { }
                // Check for right type
                this.rightType = function(check) { return false; }
                // Provide conversion
                this.convertToType = function() { }
              break;
            }

            // Finish up function declarations
            if(this.baseIsFunction) {
              this.original = temporaryFunctionProcessorOriginal;

              // Base is always default since it shouldn't ever be modified
              this.isBaseDefault = function(check) { return true; }

              // Base just calls original.
              // Again, make sure for the sake of checking types that original works without an argument!
              this.base = function() { return this.original(this); }
            }
          }
          data.Av.prototype = {
            // Get another av
            av: function() {
              return this.char.av.apply(this.char, arguments);
            },
            // Get an object with values of av
            get: function() {
              var base = this.base();
              var original = angular.copy(this.original);
              if(this.baseIsFunction) {
                original = base;
              }

              return {
                original: original,
                base: base,
                mod: this.getmod(),
                total: this.calculateMod(),
                calculated: this.baseIsFunction
              };
            },
            // Set base av
            set: function(newav) {
              // First, return if we're trying to set a function
              if(this.baseIsFunction) throw new TypeError('Av ' + this.key + ' is calculated and can\'t be set');

              // Make sure type matches
              if(!this.rightType(newav)) throw new TypeError('Type ' + typeof newav + ' can\'t be converted to ' + this.datatype);

              // Convert type if it wasn't exact
              newav = this.convertToType(newav);

              var originalInfo = this.get();
              // Wrap it into an object before callbacking, so that it can be modified.
              var newInfo = {base: angular.copy(newav)};

              // Return if callback returns false.
              if(this.callback(this, newInfo, originalInfo) === false) return;

              // Is newav default?
              if(this.isBaseDefault(newInfo.base)) {
                delete this.$()[pudding.$.av][this.index];
              } else {
                this.$()[pudding.$.av][this.index] = newInfo.base;
              }

              data.$set();
            },
            // Set av mod to a value
            mod: function(avmod) {
              // Make sure type matches
              if(!this.rightType(avmod)) return;
              // Convert type if it wasn't exact
              avmod = this.convertToType(avmod);

              var originalInfo = this.get();
              // Wrap it into an object before callbacking, so that it can be modified.
              newInfo = {mod: angular.copy(avmod)};

              // Return if callback returns false.
              if(this.callback(this, newInfo, originalInfo) === false) return;

              // Is avmod default?
              if(this.isModDefault(newInfo.mod)) {
                delete this.$()[pudding.$.avmod][this.index];
              } else {
                this.$()[pudding.$.avmod][this.index] = newInfo.mod;
              }

              data.$set();
            }
          }

      // Data (the object inside of data containing miscellanous data)
        data.data = function(key, value) {
          var parsedKey = keyParse(key);

          if(!value) {
            // If value is false, that means we should either remove that key or return it.
            if(typeof value === 'undefined') {
              return data.$[pudding.$.data][parsedKey];
            } else {
              var returnValue = data.$[pudding.$.data][parsedKey];
              delete data.$[pudding.$.data];
              data.$set();
              return returnValue;
            }
          }

          data.$[pudding.$.data][parsedKey] = value;
          data.$set();
          return data.$[pudding.$.data][parsedKey]
        }

      // Settings (Settings object - basically the same as data, but with defaults)
        data.settings = function(key, value) {
          var parsedKey = keyParse(key);

          if(typeof value === 'undefined') {
            var settingData = data.$[pudding.$.settings][parsedKey];
            if(typeof settingData === 'undefined') return pudding.config.defaultSettings[parsedKey];
            else return settingData;
          }

          if(value === pudding.config.defaultSettings[parsedKey]) {
            delete data.$[pudding.$.settings][parsedKey];
          } else {
            data.$[pudding.$.settings][parsedKey] = value;
          }
          data.$set();
          return value;
        }

      // Initialize data
      data.$get(function($) {
        // Set up change detection handler
        chrome.storage.onChanged.addListener(function(changes, areaName) {
          var changesObject = {};
          if(changes[dataName] && typeof changes[dataName].newValue == 'string') {
            changesObject[dataName] = changes[dataName].newValue;
          }

          // Load it with data loader.
          loadData(changesObject);
        });

        finishDataInitialLoad();

        // Run update
        $rootScope.$emit('data.updateData');
      });

      return data;
    }
  ]);
