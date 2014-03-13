/**
 * Module Dependencies
 */

var _ = require('lodash');
var async = require('async');
var hasOwnProperty = require('./helpers').object.hasOwnProperty;

/**
 * Queue up .add() operations on a model instance for any nested association
 * values in a .create() query.
 *
 * @param {Object} parentModel
 * @param {Object} values
 * @param {Object} associations
 * @param {Function} cb
 * @api private
 */

var create = function(parentModel, values, associations, cb) {
  var self = this;

  // For each association, grab the primary key value and normalize into model.add methods
  associations.forEach(function(association) {
    var attribute = self.waterline.schema[self.identity].attributes[association];
    var modelName;

    if(hasOwnProperty(attribute, 'collection')) modelName = attribute.collection;

    if(!modelName) return;

    var pk = self.waterline.collections[modelName].primaryKey;

    var optValues = values[association];
    optValues.forEach(function(val) {

      // If value is not an object, queue up an add
      if(!_.isPlainObject(val)) return parentModel[association].add(val);

      // If value is an object, check if a primary key is defined
      if(hasOwnProperty(val, pk)) return parentModel[associations].add(val[pk]);

      parentModel[association].add(val);
    });
  });

  // Save the parent model
  parentModel.save(cb);
};


/**
 *
 *
 */

var update = function(parents, values, associations, cb) {

  var self = this;
  var operations = {};

  associations = associations.collections.concat(associations.models);

  // For each association, grab the primary key value and normalize into model.add methods
  associations.forEach(function(association) {
    var attribute = self.waterline.schema[self.identity].attributes[association];
    var modelName = self.identity;

    if(hasOwnProperty(attribute, 'collection')) modelName = attribute.collection;
    if(!modelName) return;

    var pk = self.waterline.collections[modelName].primaryKey;
    var optValues = values[association];
    if(optValues === null) return;

    // Pull out any association values that have primary keys, these will need to be updated. All
    // values can be added for each parent however.
    operations[association] = { add: [], update: [] };

    if(!Array.isArray(optValues)) optValues = [optValues];

    optValues.forEach(function(val) {

      // If the pk is found, push it to the update stack and the pk to the add stack.
      if(hasOwnProperty(val, pk)) {
        var criteria = {};
        criteria[pk] = val[pk];
        operations[association].update.push({ model: modelName, criteria: criteria, values: val });
        operations[association].add.push(val[pk]);
        return;
      }

      operations[association].add.push(val);
    });
  });

  // Now our operations are built. First lets go through and run any updates.
  // Then for each parent, find all the current associations and remove them then add
  // all the new associations in using .add()
  async.auto({

    update: function(next) {
      async.each(Object.keys(operations), function(association, nextAssociation) {
        async.each(operations[associations].update, function(opt, nextOpt) {
          var model = self.waterline.collections[opt.model];
          model.update(opt.criteria, opt.values).exec(nextOpt);
        }, nextAssociation);
      }, next);
    },

    // For each parent, unlink all the associations currently set
    unlink: ['update', function(next, results) {
      async.each(parents, function(parent, nextParent) {

        var opts = [];

        // Inspect the association and see if this relationship has a joinTable.
        // If so create an operation criteria that clears all matching records from the
        // table. If it doesn't have a join table, build an operation criteria that
        // nulls out the foreign key on matching records.
        Object.keys(operations).forEach(function(association) {
          var attribute = self.waterline.schema[self.identity].attributes[association];

          var criteria = {};
          var searchCriteria = {};

          // If the foreign key is stored on the parent side, null it out
          if(hasOwnProperty(attribute, 'foreignKey')) {
            searchCriteria[self.primaryKey] = parent[self.primaryKey];
            criteria = { model: self.identity, criteria: searchCriteria, keyName: association, nullify: true };
            opts.push(criteria);
            return;
          }

          // Lookup the child attribute
          var child = self.waterline.schema[attribute.collection];
          var childAttribute = child.attributes[attribute.on];

          searchCriteria[attribute.on] = parent[self.primaryKey];

          // If the childAttribute stores the foreign key, find all children with the
          // foreignKey equal to the parent's primary key and null them out.
          if(hasOwnProperty(childAttribute, 'foreignKey')) {
            criteria = { model: child.identity, criteria: searchCriteria, keyName: attribute.on };
            if(!hasOwnProperty(child, 'junctionTable')) criteria.nullify = true;
            opts.push(criteria);
            return;
          }
        });


        // Run the operations
        async.each(opts, function(opt, next) {
          var Q;

          if(opt.nullify) {
            var values = {};
            values[opt.keyName] = null;
            Q = self.waterline.collections[opt.model].update(opt.criteria, values);
          } else {
            Q = self.waterline.collections[opt.model].destroy(opt.criteria);
          }

          Q.exec(next);
        }, nextParent);
      }, next);
    }],

    // For each parent found, create add operations for any associations
    link: ['unlink', function(next, results) {
      async.each(parents, function(parent, nextParent) {
        var createEach = {};

        Object.keys(operations).forEach(function(association) {
          operations[associations].add.forEach(function(opt) {

            // Check if the association has an `add` method, if so use it
            if(hasOwnProperty(parent[association], 'add')) {
              parent[association].add(opt);
              return;
            }

            createEach[association] = createEach[association] || [];
            createEach[association].push(opt);
          });
        });

        // Create each of the new records
        async.each(Object.keys(createEach), function(key, nextKey) {
          var model = self.waterline.collections[key];

          async.each(createEach[key], function(record, nextRecord) {
            model.create(record).exec(function(err, val) {
              if(err) return nextRecord(err);
              parent[key] = val[model.primaryKey];
              nextRecord();
            });
          }, nextKey);
        }, function(err) {
          if(err) return nextParent(err);
          var model = self.waterline.collections[self.identity];
          var criteria = {};
          criteria[self.primaryKey] = parent[self.primaryKey];
          model.update(criteria, parent).exec(function(err) {
            if(err) return nextParent(err);
            parent.save(nextParent);
          });
        });
      }, next);
    }]

  }, function(err) {
    if(err) return cb(err);
    cb();
  });

};


module.exports = {
  create: create,
  update: update
};
