var _ = require('underscore');

/**
 * Normalize A Collection adapter from adapters
 * definitions.
 *
 * @param {String || Array} specified model adapters
 * @param {Object} loaded adapters, required from NPM or filesystem
 * @return {Object} normalized adapter methods
 */

module.exports = function(key, adapterDefs) {

  // Create an empty object to extend from
  var adapter = {};

  // Keep track of the adapters used so we can register each one
  var _adapterDefs = [];

  // Handle a single string adapter
  if(typeof key === 'string') {

    // If the adapter is not loaded throw an error
    if(!adapterDefs[key]) {
      throw new Error('The adapter ' + key + ' is not loaded');
    }

    // Use the specified adapter
    _.extend(adapter, adapterDefs[key]);

    // Push this adapter to the _adapterDefs array
    _adapterDefs.push(adapterDefs[key]);

    return { adapter: adapter, adapterDefs: [adapter] };
  }

  // Handle an Array of adapters. Methods are overriden from right to
  // left using the underscore extend method.
  if(Array.isArray(key)) {

    // Check all the specified adapters are loaded
    key.forEach(function(obj) {

      // If an adapter is not loaded throw an error
      if(!adapterDefs[obj]) {
        throw new Error('The adapter ' + obj + ' is not loaded');
      }

      // Use the specified adapter
      _.extend(adapter, adapterDefs[obj]);

      // Push this adapter to the _adapterDefs array
      _adapterDefs.push(adapterDefs[obj]);
    });

    return { adapter: adapter, adapterDefs: _adapterDefs };
  }

  // If no adapter is specified in the model
  // use default adapter
  if(Object.keys(key).length === 0) {
    _.extend(adapter, adapterDefs['default']);
    _adapterDefs.push(adapterDefs['default']);
  }

  return { adapter: adapter, adapterDefs: [adapter] };
};
