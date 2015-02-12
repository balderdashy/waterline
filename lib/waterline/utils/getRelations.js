var _ = require('lodash');

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

  var schema = options.schema;
  var relations = [];

  _.each(schema, function(collectionSchema, collection) {
    if (!_.has(collectionSchema, 'junctionTable')) return;

    _.each(collectionSchema.attributes, function(prop, key) {
      if (!collectionSchema.attributes[key].hasOwnProperty('foreignKey')) return;
      if (collectionSchema.attributes[key].references !== options.parentCollection) return;
      relations.push(collection);
    });
  });

  return relations;
};
