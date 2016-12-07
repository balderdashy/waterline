/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var Deferred = require('../utils/query/deferred');
var OperationBuilder = require('../utils/query/operation-builder');
var OperationRunner = require('../utils/query/operation-runner');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');

/**
 * Find a single record that meets criteria
 *
 * @param {Object} criteria to search
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function findOne(criteria, cb, metaContainer) {
  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
  }

  // If the criteria given is not a dictionary, force it to be one
  if (!_.isPlainObject(criteria)) {
    var _criteria = {};
    _criteria[this.primaryKey] = criteria;
    criteria = _criteria;
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.findOne, {
      method: 'findOne',
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
    method: 'findOne',
    using: this.identity,

    criteria: criteria,
    populates: criteria.populates,

    meta: metaContainer
  };

  // Delete the criteria.populates as needed
  delete query.criteria.populates;

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_CRITERIA':
      case 'E_INVALID_POPULATES':
      case 'E_INVALID_META':
        return cb(e);
        // ^ when the standard usage error is good enough as-is, without any further customization
        //   (for examples of what it looks like to customize this, see the impls of other model methods)

      default:
        return cb(e);
        // ^ when an internal, miscellaneous, or unexpected error occurs
    }
  }


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─┌─┐
  //  ╠═╣╠═╣║║║ ║║║  ║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐└─┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴└─┘
  // Determine what to do about running any lifecycle callbacks
  (function(proceed) {
    // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
    // the methods.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed();
    } else {
      // TODO
      // This is where the `beforeFindOne()` lifecycle callback would go
      return proceed();
    }
  })(function(err) {
    if (err) {
      return cb(err);
    }


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    //
    // Operations are used on Find and FindOne queries to determine if any populates
    // were used that would need to be run cross adapter.
    var operations = new OperationBuilder(self, query);
    var stageThreeQuery = operations.queryObj;


    //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    OperationRunner(operations, stageThreeQuery, self, function opRunnerCb(err, values) {
      if (err) {
        return cb(err);
      }

      return cb(undefined, _.first(values));
    });
  });
};
