var _ = require('lodash'),
    async = require('async'),
    updateInstance = require('../associationMethods/update'),
    addAssociation = require('../associationMethods/add'),
    removeAssociation = require('../associationMethods/remove');

/**
 * Model.save()
 *
 * Takes the currently set attributes and updates the database.
 * Shorthand for Model.update({ attributes }, cb)
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Function} callback
 * @api public
 */

module.exports = function(context, proto, cb) {

  /**
   * TO-DO:
   * This should all be wrapped in a transaction. That's coming next but for the meantime
   * just hope we don't get in a nasty state where the operation fails!
   */

  async.auto({

    // Update The Current Record
    updateRecord: function(next) {
      new updateInstance(context, proto, next);
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
    addAssociations: ['buildAssociationOperations', function(next, results) {
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
        for(var key in results.buildAssociationOperations.addKeys) {
          proto.associations[key].removeModels = [];
        }

        next(null, failedTransactions);
      });
    }]

  }, function(err, results) {
    if(err) return cb(err);

    // Collect all failed transactions if any
    var failedTransactions = [];

    if(results.addAssociations) {
      failedTransactions = failedTransactions.concat(results.addAssociations);
    }

    if(results.removeAssociations) {
      failedTransactions = failedTransactions.concat(results.removeAssociations);
    }

    if(failedTransactions.length > 0) {
      return cb(failedTransactions);
    }

    // Absorb new values
    var obj = results.updateRecord[0].toObject();
    _.extend(proto, obj);

    cb(null, proto.toObject());
  });
};
