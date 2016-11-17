/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../deferred');
var OperationBuilder = require('../../utils/query/operation-builder');
var OperationRunner = require('../../utils/query/operation-runner');
var forgeStageTwoQuery = require('../../utils/query/forge-stage-two-query');


/**
 * Find All Records that meet criteria
 *
 * @param {Object} search criteria
 * @param {Object} options
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function find(criteria, options, cb, metaContainer) {
  if (_.isFunction(criteria)) {
    cb = criteria;
    criteria = null;

    if(arguments.length === 1) {
      options = null;
    }
  }

  // If options is a function, we want to check for any more values before nulling
  // them out or overriding them.
  if (_.isFunction(options)) {
    // If cb also exists it means there is a metaContainer value
    if (cb) {
      metaContainer = cb;
      cb = options;
      options = null;
    } else {
      cb = options;
      options = null;
    }
  }

  // Fold in criteria options
  if (_.isPlainObject(options) && _.isPlainObject(criteria)) {
    criteria = _.extend({}, criteria, options);
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.find, {
      method: 'find',
      criteria: criteria,
      values: options
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'find',
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

      case 'E_INVALID_POPULATES':
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid populate(s).\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }


  // TODO
  // This is where the `beforeFind()` lifecycle callback would go


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  //
  // Operations are used on Find and FindOne queries to determine if any populates
  // were used that would need to be run cross adapter.
  var operations = new OperationBuilder(this, query);
  var stageThreeQuery = operations.queryObj;

  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  OperationRunner(operations, stageThreeQuery, this, function opRunnerCb(err, models) {
    if (err) {
      return cb(err);
    }

    return cb(undefined, models);
  });
};
