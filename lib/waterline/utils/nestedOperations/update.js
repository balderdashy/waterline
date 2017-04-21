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

  // Combine model and collection associations
  associations = associations.collections.concat(associations.models);

  // Build up .add and .update operations for each association
  var operations = buildOperations.call(self, parents, associations, values);

  // Now that our operations are built, lets go through and run any updates.
  // Then for each parent, find all the current associations and remove them then add
  // all the new associations in using .add()
  sync.call(self, parents, operations, cb);

};


/**
 * Build Up Operations (add and update)
 *
 * @param {Array} associations
 * @param {Object} values
 * @return {Object}
 */

function buildOperations(parents, associations, values) {

  var self = this;
  var operations = {};

  // For each association, grab the primary key value and normalize into model.add methods
  associations.forEach(function(association) {

    var optValues = values[association];

    // If values are being nulled out just return. This is used when removing foreign
    // keys on the parent model.
    if (optValues === null) return;

    // Pull out any association values that have primary keys, these will need to be updated. All
    // values can be added for each parent however.
    operations[association] = {
      add: [],
      update: []
    };

    // Normalize optValues to an array
    if (!Array.isArray(optValues)) optValues = [optValues];
    queueOperations.call(self, parents, association, operations[association], optValues);
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

function queueOperations(parents, association, operation, values) {

  var self = this;
  var attribute = self.waterline.schema[self.identity].attributes[association];
  var modelName;

  if (hop(attribute, 'collection')) modelName = attribute.collection;
  if (hop(attribute, 'foreignKey')) modelName = attribute.references;
  if (!modelName) return;

  var collection = self.waterline.collections[modelName];

  // Grab the relation's PK
  var relatedPK = _.find(collection.attributes, { primaryKey: true });
  var relatedPkName = collection.primaryKey;

  // If this is a join table, we can just queue up operations on the parent
  // for this association.
  if (collection.junctionTable) {

    // For each parent, queue up any .add() operations
    parents.forEach(function(parent) {
      values.forEach(function(val) {
        if (!hop(parent, association)) return;
        if (typeof parent[association].add !== 'function') return;
        parent[association].add(val);
      });
    });

    return;
  }

  values.forEach(function(val) {

    // Check the values and see if the model's primary key is given. If so look into
    // the schema attribute and check if this is a collection or model attribute. If it's
    // a collection attribute lets update the child record and if it's a model attribute,
    // update the child and set the parent's foreign key value to the new primary key.
    //
    // If a custom PK was used and it's not autoIncrementing add the record. This
    // allows nested creates to work when custom PK's are used.
    if (!relatedPK.autoIncrement && !collection.autoPK) {
      operation.add.push(val);
      return;
    }

    // If it's missing a PK queue up an add
    if (!hop(val, relatedPkName)) {
      operation.add.push(val);
      return;
    }

    // Build up the criteria that will be used to update the child record
    var criteria = {};
    criteria[relatedPkName] = val[relatedPkName];

    // Queue up the update operation
    operation.update.push({ model: modelName, criteria: criteria, values: val });

    // Check if the parents foreign key needs to be updated
    if (!hop(attribute, 'foreignKey')) {
      operation.add.push(val[relatedPkName]);
      return;
    }

    // Set the new foreign key value for each parent
    parents.forEach(function(parent) {
      parent[association] = val[relatedPkName];
    });

  });
}

/**
 * Sync Associated Data
 *
 * Using the operations, lets go through and run any updates on any nested object with
 * primary keys. This ensures that all the data passed up is persisted. Then for each parent,
 * find all the current associations and unlink them and then add all the new associations
 * in using .add(). This ensures that whatever is passed in to an update is what the value will
 * be when queried again.
 *
 * @param {Object} operations
 * @param {Function} cb
 */

function sync(parents, operations, cb) {
  var self = this;

  async.auto({

    // Update any nested associations
    update: function(next) {
      updateRunner.call(self, parents, operations, next);
    },

    // For each parent, unlink all the associations currently set
    unlink: ['update', function(next) {
      unlinkRunner.call(self, parents, operations, next);
    }],

    // For each parent found, link any associations passed in by either creating
    // the new record or linking an existing record
    link: ['unlink', function(next) {
      linkRunner.call(self, parents, operations, next);
    }]

  }, cb);
}


////////////////////////////////////////////////////////////////////////////////////////
// .sync() - Async Auto Runners
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

function updateRunner(parents, operations, cb) {

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


/**
 * Unlink Associated Records.
 *
 * For each association passed in to the update we are essentially replacing the
 * association's value. In order to do this we first need to clear out any associations
 * that currently exist.
 *
 * @param {Object} operations
 * @param {Function} cb
 */

function unlinkRunner(parents, operations, cb) {

  var self = this;

  // Given a parent, build up remove operations and run them.
  function unlinkParentAssociations(parent, next) {
    var opts = buildParentRemoveOperations.call(self, parent, operations);
    removeOperationRunner.call(self, opts, next);
  }

  async.each(parents, unlinkParentAssociations, cb);
}


/**
 * Link Associated Records
 *
 * Given a set of operations, associate the records with the parent records. This
 * can be done by either creating join table records or by setting foreign keys.
 * It defaults to a parent.add() method for most situations.
 *
 * @param {Object} operations
 * @param {Function} cb
 */

function linkRunner(parents, operations, cb) {

  var self = this;

  function linkChildRecords(parent, next) {

    // Queue up `.add()` operations on the parent model and figure out
    // which records need to be created.
    //
    // If an .add() method is available always use it. If this is a nested model an .add()
    // method won't be available so queue up a create operation.
    var recordsToCreate = buildParentLinkOperations.call(self, parent, operations);

    // Create the new records and update the parent with the new foreign key
    // values that may have been set when creating child records.
    createNewRecords.call(self, parent, recordsToCreate, function(err) {
      if (err) return next(err);
      updateParentRecord(parent, cb);
    });
  }

  // Update the parent record one last time. This ensures a model attribute (single object)
  // on the parent can create a new record and then set the parent's foreign key value to
  // the newly created child record's primary key.
  //
  // Example:
  // Parent.update({
  //   name: 'foo',
  //   nestedModel: {
  //     name: 'bar'
  //   }
  // })
  //
  // The above query would create the new nested model and then set the parent's nestedModel
  // value to the newly created model's primary key.
  //
  // We then run a .save() to persist any .add() records that may have been used. The update and
  // .save() are used instead of a find and then save because it's the same amount of queries
  // and it's easier to take advantage of all that the .add() method gives us.
  //
  //
  // TO-DO:
  // Make this much smarter to reduce the amount of queries that need to be run. We should probably
  // be able to at least cut this in half!
  //
  function updateParentRecord(parent, next) {

    var criteria = {};
    var model = self.waterline.collections[self.identity];

    criteria[self.primaryKey] = parent[self.primaryKey];
    var pValues = parent.toObject();

    model.update(criteria, pValues).exec(function(err) {
      if (err) return next(err);

      // Call .save() to persist any .add() functions that may have been used.
      parent.save(next);
    });
  }

  async.each(parents, linkChildRecords, cb);
}


////////////////////////////////////////////////////////////////////////////////////////
// .sync() - Helper Functions
////////////////////////////////////////////////////////////////////////////////////////


/**
 * Build up operations for performing unlinks.
 *
 * Given a parent and a set of operations, queue up operations to either
 * remove join table records or null out any foreign keys on an child model.
 *
 * @param {Object} parent
 * @param {Object} operations
 * @return {Array}
 */

function buildParentRemoveOperations(parent, operations) {

  var self = this;
  var opts = [];

  // Inspect the association and see if this relationship has a joinTable.
  // If so create an operation criteria that clears all matching records from the
  // table. If it doesn't have a join table, build an operation criteria that
  // nulls out the foreign key on matching records.
  Object.keys(operations).forEach(function(association) {

    var criteria = {};
    var searchCriteria = {};
    var attribute = self.waterline.schema[self.identity].attributes[association];

    /////////////////////////////////////////////////////////////////////////
    // Parent Record:
    // If the foreign key is stored on the parent side, null it out
    /////////////////////////////////////////////////////////////////////////

    if (hop(attribute, 'foreignKey')) {

      // Set search criteria where primary key is equal to the parents primary key
      searchCriteria[self.primaryKey] = parent[self.primaryKey];

      // Store any information we may need to build up an operation.
      // Use the `nullify` key to show we want to perform an update and not a destroy.
      criteria = {
        model: self.identity,
        criteria: searchCriteria,
        keyName: association,
        nullify: true
      };

      opts.push(criteria);
      return;
    }

    /////////////////////////////////////////////////////////////////////////
    // Child Record:
    // Lookup the attribute on the other side of the association on in the
    // case of a m:m association the child table will be the join table.
    /////////////////////////////////////////////////////////////////////////

    var child = self.waterline.schema[attribute.collection];
    var childAttribute = child.attributes[attribute.onKey];

    // Set the search criteria to use the collection's `via` key and the parent's primary key.
    searchCriteria[attribute.on] = parent[self.primaryKey];

    // If the childAttribute stores the foreign key, find all children with the
    // foreignKey equal to the parent's primary key and null them out or in the case of
    // a `junctionTable` flag destroy them.
    if (hop(childAttribute, 'foreignKey')) {

      // Store any information needed to perform the query. Set nullify to false if
      // a `junctionTable` property is found.
      criteria = {
        model: child.identity,
        criteria: searchCriteria,
        keyName: attribute.on,
        nullify: !hop(child, 'throughTable')
      };


      opts.push(criteria);
      return;
    }
  });

  return opts;
}


/**
 * Remove Operation Runner
 *
 * Given a criteria object matching a remove operation, perform the
 * operation using waterline collection instances.
 *
 * @param {Array} operations
 * @param {Function} callback
 */

function removeOperationRunner(operations, cb) {

  var self = this;

  function runner(operation, next) {
    var values = {};

    // If nullify is false, run a destroy method using the criteria to destroy
    // the join table records.
    if (!operation.nullify) {
      self.waterline.collections[operation.model].destroy(operation.criteria).exec(next);
      return;
    }

    // Run an update operation to set the foreign key to null on all the
    // associated child records.
    values[operation.keyName] = null;

    self.waterline.collections[operation.model].update(operation.criteria, values).exec(next);
  }


  // Run the operations
  async.each(operations, runner, cb);
}


/**
 * Build up operations for performing links.
 *
 * Given a parent and a set of operations, queue up operations to associate two
 * records together. This could be using the parent's `.add()` method which handles
 * the logic for us or building up a `create` operation that we can run to create the
 * associated record with the correct foreign key set.
 *
 * @param {Object} parent
 * @param {Object} operations
 * @return {Object}
 */

function buildParentLinkOperations(parent, operations) {

  var recordsToCreate = {};

  // Determine whether to use the parent association's `.add()` function
  // or whether to queue up a create operation.
  function determineOperation(association, opt) {

    // Check if the association has an `add` method, if so use it.
    if (hop(parent[association], 'add')) {
      parent[association].add(opt);
      return;
    }

    recordsToCreate[association] = recordsToCreate[association] || [];
    recordsToCreate[association].push(opt);
  }

  // For each operation look at all the .add operations and determine
  // what to do with them.
  Object.keys(operations).forEach(function(association) {
    operations[association].add.forEach(function(opt) {
      determineOperation(association, opt);
    });
  });

  return recordsToCreate;
}


/**
 * Create New Records.
 *
 * Given an object of association records to create, perform a create
 * on the child model and set the parent's foreign key to the newly
 * created record's primary key.
 *
 * @param {Object} parent
 * @param {Object} recordsToCreate
 * @param {Function} cb
 */

function createNewRecords(parent, recordsToCreate, cb) {

  var self = this;

  // For each association, run the createRecords function
  // in the model context.
  function mapAssociations(association, next) {

    // First, pull the model attribute's referenced (foreign) collection
    var attribute = self.waterline.schema[self.identity].attributes[association];
    var referencedCollection = attribute.references;

    var model = self.waterline.collections[referencedCollection];
    var records = recordsToCreate[association];

    function createRunner(record, nextRecord) {
      var args = [parent, association, record, nextRecord];
      createRecord.apply(model, args);
    }

    async.each(records, createRunner, next);
  }

  // Create a record and set the parent's foreign key to the
  // newly created record's primary key.
  function createRecord(parent, association, record, next) {
    var self = this;

    this.create(record).exec(function(err, val) {
      if (err) return next(err);
      parent[association] = val[self.primaryKey];
      next();
    });
  }


  async.each(Object.keys(recordsToCreate), mapAssociations, cb);
}
