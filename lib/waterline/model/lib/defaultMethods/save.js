var _ = require('lodash');
var async = require('async');
var deep = require('deep-diff');
var updateInstance = require('../associationMethods/update');
var addAssociation = require('../associationMethods/add');
var removeAssociation = require('../associationMethods/remove');
var hop = require('../../../utils/helpers').object.hasOwnProperty;
var defer = require('../../../utils/defer');
var noop = function() {};

/**
 * Model.save()
 *
 * Takes the currently set attributes and updates the database.
 * Shorthand for Model.update({ attributes }, cb)
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Function} callback
 * @return {Promise}
 * @api public
 */

module.exports = function(context, proto, cb) {
  var deferred = defer();
  cb = cb || noop;

  /**
   * TO-DO:
   * This should all be wrapped in a transaction. That's coming next but for the meantime
   * just hope we don't get in a nasty state where the operation fails!
   */

  var mutatedModels = [];

  async.auto({

    // Compare any populated model values to their current state.
    // If they have been mutated then the values will need to be synced.
    compareModelValues: function(next) {
      var modelKeys = Object.keys(proto.associationsCache);

      async.each(modelKeys, function(key, nextKey) {

        if(!hop(proto, key) || proto[key] === undefined) return nextKey();

        var currentVal = proto[key];
        var previousVal = proto.associationsCache[key];

        // Normalize previousVal to an object
        if(Array.isArray(previousVal)) previousVal = previousVal[0];

        if(deep(currentVal, previousVal)) {
          mutatedModels.push(key);
        }

        nextKey();
      }, next);
    },

    // Update The Current Record
    updateRecord: ['compareModelValues', function(next) {

      // Shallow clone proto.toObject() to remove all the functions
      var data = _.clone(proto.toObject());

      new updateInstance(context, data, mutatedModels, function(err, data) {
        next(err, data);
      });
    }],


    // Build a set of associations to add and remove.
    // These are populated from using model[associationKey].add() and
    // model[associationKey].remove().
    buildAssociationOperations: ['compareModelValues', function(next) {

      // Build a dictionary to hold operations based on association key
      var operations = {
        addKeys: {},
        removeKeys: {}
      };

      Object.keys(proto.associations).forEach(function(key) {

        // Ignore belongsTo associations
        if(proto.associations[key].hasOwnProperty('model')) return;

        // Grab what records need adding
        if(proto.associations[key].addModels.length > 0) {
          operations.addKeys[key] = proto.associations[key].addModels;
        }

        // Grab what records need removing
        if(proto.associations[key].removeModels.length > 0) {
          operations.removeKeys[key] = proto.associations[key].removeModels;
        }
      });

      return next(null, operations);
    }],

    // Create new associations for each association key
    addAssociations: ['buildAssociationOperations', 'updateRecord', function(next, results) {
      var keys = results.buildAssociationOperations.addKeys;
      return new addAssociation(context, proto, keys, function(err, failedTransactions) {
        if(err) return next(err);

        // reset addKeys
        for(var key in results.buildAssociationOperations.addKeys) {
          proto.associations[key].addModels = [];
        }

        next(null, failedTransactions);
      });
    }],

    // Remove associations for each association key
    // Run after the addAssociations so that the connection pools don't get exhausted.
    // Once transactions are ready we can remove this restriction as they will be run on the same
    // connection.
    removeAssociations: ['buildAssociationOperations', 'addAssociations', function(next, results) {
      var keys = results.buildAssociationOperations.removeKeys;
      return new removeAssociation(context, proto, keys, function(err, failedTransactions) {
        if(err) return next(err);

        // reset removeKeys
        for(var key in results.buildAssociationOperations.removeKeys) {
          proto.associations[key].removeModels = [];
        }

        next(null, failedTransactions);
      });
    }]

  }, function(err, results) {
    if(err) {
      deferred.reject(err);
      return cb(err);
    }

    // Collect all failed transactions if any
    var failedTransactions = [];

    if(results.addAssociations) {
      failedTransactions = failedTransactions.concat(results.addAssociations);
    }

    if(results.removeAssociations) {
      failedTransactions = failedTransactions.concat(results.removeAssociations);
    }

    if(failedTransactions.length > 0) {
      deferred.reject(failedTransactions);
      return cb(failedTransactions);
    }

    // Rebuild proper criteria object from the original query
    var PK = context.primaryKey;

    if(!results.updateRecord.length) {
      var error = new Error('Error updating a record.');
      deferred.reject(error);
      return cb(error);
    }

    var obj = results.updateRecord[0].toObject();
    var populations = Object.keys(proto.associations);
    var criteria = {};
    criteria[PK] = obj[PK];

    // Build up a new query and re-populate everything
    var query = context.findOne(criteria);
    populations.forEach(function(pop) {
      query.populate(pop);
    });

    query.exec(function(err, data) {
      if(err) 
      {
        deferred.reject(err);
        return cb(err);
      }
      deferred.resolve(data);
      cb(null, data);
    });
  });

  return deferred.promise;
};
