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
module.exports = function acyclicTraversal(schema, initialModel, initialRelation) {

	// Closure variable used to store the result plan.
	var resultPlan = {};

	// Track the edges which have already been traversed
	var alreadyTraversed = [
		// {
		//   relation: initialRelation,
		//   model: initialModel
		// }
	];

	return traverseSchemaGraph(initialModel, initialRelation);

	/**
	 * Recursive function
	 * @param  {[type]} modelIdentity  [description]
	 * @param  {[type]} nameOfRelation [description]
	 * @return {[type]}                [description]
	 */
	function traverseSchemaGraph(modelIdentity, nameOfRelation) {

		var currentModel = schema[modelIdentity];
		var currentAttributes = currentModel.attributes;

		// If this relation has already been traversed, return.
		// (i.e. `schema.attributes.modelIdentity.nameOfRelation`)
		var isRedundant = _.findWhere(alreadyTraversed, {
			alias: nameOfRelation,
			model: modelIdentity
		});
		if (isRedundant) return;

		// Push this relation onto the `alreadyTraversed` stack.
		alreadyTraversed.push({
			alias: nameOfRelation,
			model: modelIdentity
		});

		// If the `via` back-reference has already been traversed, return.
		// (because the information therein is probably redundant)
		// TODO


		var relation = currentAttributes[nameOfRelation];
		if (!relation) throw new Error('Unknown relation in schema: ' + modelIdentity + '.' + nameOfRelation);
		var identityOfRelatedModel = relation.model || relation.collection;

		// Get the current model
		var model = schema[identityOfRelatedModel];

		// Get the related model
		var relatedModel = schema[identityOfRelatedModel];


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

		// Return a piece of the result plan by calling `traverseSchemaGraph`
		// on each of the RELATED model's relations.
		return _.reduce(relations, function (resultPlanPart, relation) {

			// Recursive step
			resultPlanPart[relation.alias] = traverseSchemaGraph(identityOfRelatedModel, relation.alias);

			// Trim undefined result plan parts
			if (resultPlanPart[relation.alias] === undefined) {
				delete resultPlanPart[relation.alias];
			}

			return resultPlanPart;
		}, {});
	}

};