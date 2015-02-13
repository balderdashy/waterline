var _ = require('lodash');
var hasProperty = require('./helpers').object.hasProperty;

/**
 * getRelations
 *
 * Find any `junctionTables` that reference the parent collection.
 * 
 * @param  {[type]} options [description]
 *    @option parentCollection
 *    @option schema
 * @return {[type]}         [relations]
 */

module.exports = function getRelations(options) {
  return _(options.schema)
   .reject(hasProperty('junctionTable'))
   .filter(function(collection) {
    return _.any(collection.attributes, function(value) {
      return _.has(value, 'foreignKey') && value.references === options.parentCollection;
    });
   })
   .value();
};
