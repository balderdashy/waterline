/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * Traverse the shema to build a populate plan object
 * that will populate every relation, sub-relation, and so on
 * reachable from the initial model and relation at least once
 * (perhaps most notable is that this provides access to most 
 * related data without getting caught in loops.)
 * 
 * @param  {[type]} schema          [description]
 * @param  {[type]} initialModel    [description]
 * @param  {[type]} initialRelation [description]
 * @return {[type]}                 [description]
 */
module.exports = function acyclicTraversal ( schema, initialModel, initialRelation ) {

	// Closure variable used to store the result plan.
  var resultPlan = {};

  // Track the edges which have already been traversed
  var alreadyTraversed = [
		// {
	  //   relation: initialRelation,
	  //   model: initialModel
		// }
  ];

  return traverseSchemaGraph( initialModel, initialRelation );

  /**
   * Recursive function
   * @param  {[type]} modelIdentity  [description]
   * @param  {[type]} nameOfRelation [description]
   * @return {[type]}                [description]
   */
	function traverseSchemaGraph (modelIdentity, nameOfRelation) {

    var currentModel = schema[modelIdentity];
    var currentAttributes = currentModel.attributes;
    
    // If this relation has already been traversed, return.
    // (i.e. `schema.attributes.modelIdentity.nameOfRelation`)
    // TODO
    
    // Add this hop to the result plan
    // TODO

    // Get the model of the relation
    var relationAttr = currentAttributes[nameOfRelation];
    var identityOfRelatedModel = relationAttr.model || relationalAttr.collection;
    var relatedModel = schema[modelIdentity];
    
    // Lookup ALL the relations OF THE RELATED model.
    var relations = 
    _(relatedModel.attributes).reduce(function buildSubsetOfAssociations(relations, attrDef, attrName) {
      if (_.isObject(attrDef) && (attrDef.model || attrDef.collection)) {
        relations.push(_.merge({
          alias: attrName,
          identity: attrDef.model || attrDef.collection,
          cardinality: attrDef.model ? 'model' : 'collection'
        }, attrDef));
        return relations;
      }
      return relations;
    }, []);

    // Recursive step:
    // Call `traverseSchemaGraph` on each of the RELATED model's relations.
    _.each(relations, function (relation) {
      traverseSchemaGraph(relation.identity, relation.alias);
    });
  }
	
};
