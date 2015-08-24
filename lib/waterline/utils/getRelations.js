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

  Object.keys(schema).forEach(function(collection) {
    var collectionSchema = schema[collection];
    if (!collectionSchema.hasOwnProperty('junctionTable')) return;

    Object.keys(collectionSchema.attributes).forEach(function(key) {
      if (!collectionSchema.attributes[key].hasOwnProperty('foreignKey')) return;
      if (collectionSchema.attributes[key].references !== options.parentCollection) return;
      relations.push(collection);
    });
  });

  return relations;
};
