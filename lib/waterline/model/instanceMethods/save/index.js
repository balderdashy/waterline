var _ = require('underscore'),
    async = require('async'),
    updateInstance = require('./updateInstance'),
    addAssociation = require('./addAssociation');

/**
 * Model.save()
 *
 * Takes the currently set attributes and updates the database.
 * Shorthand for Model.update({ attributes }, cb)
 *
 * @param {Function} callback
 * @return callback - (err, results)
 */

module.exports = function(context, cb) {
  var self = this;

  /**
   * TO-DO:
   * This should all be wrapped in a transaction. That's coming next but for the meantime
   * just hope we don't get in a nasty state where the operation fails!
   */

  async.auto({

    // Update The Current Record
    updateRecord: function(next) {
      updateInstance.call(self, context, next);
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

      Object.keys(self.associations).forEach(function(key) {

        // Grab what records need adding
        if(self.associations[key].addModels.length > 0) {
          operations.addKeys[key] = self.associations[key].addModels;
        }

        // Grab what records need removing
        if(self.associations[key].removeModels.length > 0) {
          operations.removeKeys[key] = self.associations[key].removeModels;
        }
      });

      next(null, operations);
    },


    // Create new associations for each association key
    addAssociations: ['buildAssociationOperations', function(next, results) {
      addAssociation.call(self, context, results.buildAssociationOperations.addKeys, next);
    }]

  }, function(err, results) {

    if(err) return cb(err);
    if(results.addAssociations) {
      return cb(new Error('Failed transactions' + JSON.stringify(results.addAssociations)));
    }

    // Absorb new values
    var obj = results.updateRecord[0].toObject();
    _.extend(self, obj);

    cb(null, self.toObject());
  });
};
