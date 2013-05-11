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

  // Handle a single string adapter
  if(typeof key === 'string') {

    // If the adapter is not loaded throw an error
    if(!adapterDefs[key]) {
      throw new Error('The adapter ' + key + ' is not loaded');
    }

    // Use the specified adapter
    _.extend(adapter, adapterDefs[key]);

    return adapter;
  }

  // Handle an Array of adapters. Methods are overriden from right to
  // left using the underscore extend method.
  if(key instanceof Array) {

    // Check all the specified adapters are loaded
    key.forEach(function(obj) {

      // If an adapter is not loaded throw an error
      if(!adapterDefs[obj]) {
        throw new Error('The adapter ' + obj + ' is not loaded');
      }

      _.extend(adapter, adapterDefs[obj]);
    });

    return adapter;
  }

  // If no adapter is specified in the model
  // use default adapter
  if(Object.keys(key).length === 0) {
    _.extend(adapter, adapterDefs['default']);
  }

  return adapter;
};
