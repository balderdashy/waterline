/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var forgeStageTwoQuery = require('../../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../../utils/query/forge-stage-three-query');
var Deferred = require('../deferred');
var getRelations = require('../../utils/getRelations');
var callbacks = require('../../utils/callbacksRunner');

/**
 * Destroy a Record
 *
 * @param {Object} criteria to destroy
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(criteria, cb, metaContainer) {
  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = {};
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.destroy, {
      method: 'destroy',
      criteria: criteria
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'destroy',
    using: this.identity,
    criteria: criteria,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_CRITERIA':
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid criteria.\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }


  callbacks.beforeDestroy(self, query.criteria, function(err) {
    if (err) {
      return cb(err);
    }


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    var stageThreeQuery;
    try {
      stageThreeQuery = forgeStageThreeQuery({
        stageTwoQuery: query,
        identity: self.identity,
        transformer: self._transformer,
        originalModels: self.waterline.collections
      });
    } catch (e) {
      return cb(e);
    }


    //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
    //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
    //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─
    self.adapter.destroy(stageThreeQuery.criteria, function(err, result) {
      if (err) {
        return cb(err);
      }

      // For now, just return after.
      // TODO: comeback to this and find a better way to do cascading deletes.
      return after();


      // Look for any m:m associations and destroy the value in the join table
      var relations = getRelations({
        schema: self.waterline.schema,
        parentCollection: self.identity
      });

      if (relations.length === 0) {
        return after();
      }

      // Find the collection's primary key
      var primaryKey = self.primaryKey;

      function destroyJoinTableRecords(item, next) {
        var collection = self.waterline.collections[item];
        var refKey;

        Object.keys(collection._attributes).forEach(function(key) {
          var attr = collection._attributes[key];
          if (attr.references !== self.identity) return;
          refKey = key;
        });

        // If no refKey return, this could leave orphaned join table values but it's better
        // than crashing.
        if (!refKey) return next();

        // Make sure we don't return any undefined pks
        // var mappedValues = _.reduce(result, function(memo, vals) {
        //   if (vals[pk] !== undefined) {
        //     memo.push(vals[pk]);
        //   }
        //   return memo;
        // }, []);
        var mappedValues = [];

        var criteria = {};

        if (mappedValues.length > 0) {
          criteria[refKey] = mappedValues;
          var q = collection.destroy(criteria);

          if(metaContainer) {
            q.meta(metaContainer);
          }

          q.exec(next);
        } else {
          return next();
        }

      }

      async.each(relations, destroyJoinTableRecords, function(err) {
        if (err) return cb(err);
        after();
      });

      function after() {
        callbacks.afterDestroy(self, result, function(err) {
          if (err) {
            return cb(err);
          }

          cb(undefined, result);
        });
      }

    }, metaContainer);
  });
};
