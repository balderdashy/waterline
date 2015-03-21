/**
 * Module Dependencies
 */

var _ = require('lodash');
var async = require('async');
var hop = require('../helpers').object.hasOwnProperty;


/**
 * Update nested associations. Will take a values object and perform updating and
 * creating of all the nested associations. It's the same as syncing so it will first
 * remove any associations related to the parent and then "sync" the new associations.
 *
 * @param {Array} parents
 * @param {Object} values
 * @param {Object} associations
 * @param {Function} cb
 */

module.exports = function(parents, values, associations, cb) {

  var self = this;

  // Cache parents
  this.parents = parents;

  // Combine model and collection associations
  associations = associations.collections.concat(associations.models);

  // Build up .add and .update operations for each association
  var operations = buildOperations.call(self, associations, values);

  // Now that our operations are built, lets go through and run any updates.
  updateRunner.call(self, operations, cb);
  
};


/**
 * Build Up Operations (add and update)
 *
 * @param {Array} associations
 * @param {Object} values
 * @return {Object}
 */

function buildOperations(associations, values) {

  var self = this;
  var operations = {};

  // For each association, grab the primary key value and normalize into model.add methods
  associations.forEach(function(association) {

    var optValues = values[association];

    // If values are being nulled out just return. This is used when removing foreign
    // keys on the parent model.
    if(optValues === null) return;

    // Currently just performs updates, but we can create other runners and resort to async
    // if other operations should also happen.
    operations[association] = {
      update: []
    };

    // Normalize optValues to an array
    if(!Array.isArray(optValues)) optValues = [optValues];
    queueOperations.call(self, association, operations[association], optValues);
  });

  return operations;
}

/**
 * Queue Up Operations.
 *
 * Takes the array normalized association values and queues up
 * operations for the specific association.
 *
 * @param {String} association
 * @param {Object} operation
 * @param {Array} values
 */

function queueOperations(association, operation, values) {

  var self = this;
  var attribute = self.waterline.schema[self.identity].attributes[association];
  var modelName;

  if(hop(attribute, 'collection')) modelName = attribute.collection;
  if(hop(attribute, 'foreignKey')) modelName = attribute.references;
  if(!modelName) return;

  var collection = self.waterline.collections[modelName];
  var modelPk = collection.primaryKey;

  // If this is a join table, there shouldn't be any nested updates.
  if(collection.junctionTable) {
    return;
  }

  values.forEach(function(val) {

    // We have to abort if we don't know which model instance to update
    if(!hop(val, modelPk)) {
      return;
    }

    // Build up the criteria that will be used to update the child record
    var criteria = {};
    criteria[modelPk] = val[modelPk];

    // Queue up the update operation
    operation.update.push({ model: modelName, criteria: criteria, values: val });

  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Runners
////////////////////////////////////////////////////////////////////////////////////////


/**
 * Run Update Operations.
 *
 * Uses the information stored in an operation to perform a .update() on the
 * associated model using the new values.
 *
 * @param {Object} operation
 * @param {Function} cb
 */

function updateRunner(operations, cb) {

  var self = this;

  // There will be an array of update operations inside of a namespace. Use this to run
  // an update on the model instance of the association.
  function associationLoop(association, next) {
    async.each(operations[association].update, update, next);
  }

  function update(operation, next) {
    var model = self.waterline.collections[operation.model];
    model.update(operation.criteria, operation.values).exec(next);
  }

  // Operations are namespaced under an association key. So run each association's updates
  // in parallel for now. May need to be limited in the future but all adapters should
  // support connection pooling.
  async.each(Object.keys(operations), associationLoop, cb);

}


