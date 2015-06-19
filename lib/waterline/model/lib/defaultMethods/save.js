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

  var deferred;

  if(typeof cb !== 'function') {
    deferred = defer();
  }

  cb = cb || noop;

  var dirtyProperties = proto.dirty(),
      mutatedModels   = [];

  _.forIn(proto.associations, function (value, key) {
    if (dirtyProperties[key]) {
      mutatedModels.push(key);
    }
  });

  /**
   * @todo This should all be wrapped in a transaction. That's coming next but for the meantime
   * @todo just hope we don't get in a nasty state where the operation fails!
   */
  async.auto({
    updateRecord: function(next) {
      if (false === dirtyProperties) {
        return next();
      }

      new updateInstance(context, dirtyProperties, mutatedModels, next);
    },

    // Build a set of associations to add and remove.
    // These are populated from using model[associationKey].add() and
    // model[associationKey].remove().
    buildAssociationOperations: function(next) {

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
    },

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
  },

  function(err, results) {
    if(err) {
      if(deferred) {
        deferred.reject(err);
      }
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
      if(deferred) {
        deferred.reject(failedTransactions);
      }
      return cb(failedTransactions);
    }

    // Rebuild proper criteria object from the original query
    var PK = context.primaryKey;

    if (typeof results.updateRecord !== 'undefined' && !results.updateRecord.length) {
      var error = new Error('Error updating a record.');
      if(deferred) {
        deferred.reject(error);
      }

      return cb(error);
    }

    if (dirtyProperties) {
      proto.clean();
    }

    if (typeof results.updateRecord === 'undefined') {
      results.updateRecord = proto;
    } else {
      results.updateRecord = results.updateRecord[0];
    }

    var obj = results.updateRecord.toObject();
    var populations = Object.keys(proto.associations);
    var criteria = {};
    criteria[PK] = obj[PK];

    // Build up a new query and re-populate everything
    var query = context.findOne(criteria);
    populations.forEach(function(pop) {
      query.populate(pop);
    });

    query.exec(function(err, data) {
      if(err) {
        if(deferred) {
          deferred.reject(err);
        }
        return cb(err);
      }

      if(deferred) {
        deferred.resolve(data);
      }

      cb(null, data);
    });
  });

  if(deferred) {
    return deferred.promise;
  }
};
