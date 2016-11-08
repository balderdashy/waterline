/**
 * Module dependencies
 */

var _ = require('lodash');
var flaverr = require('flaverr');
var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');
var Deferred = require('../deferred');


/**
 * sum()
 *
 * Get the aggregate sum of the specified attribute across all matching records.
 *
 * ```
 * // The cumulative account balance of all bank accounts that have
 * // less than $32,000, or that are flagged as "suspended".
 * BankAccount.sum('balance').where({
 *   or: [
 *     { balance: { '<': 32000 } },
 *     { suspended: true }
 *   ]
 * }).exec(function (err, total){
 *   // ...
 * });
 * ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {String|Dictionary} `numericAttrName` or `queryKeys`
 *
 * @param {Function?} done
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} metaContainer
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no `done` callback was provided
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * The underlying query keys:
 * ==============================
 *
 * @qkey {Dictionary?} numericAttrName
 *     The name of a numeric attribute.
 *     (Must be declared as `type: 'number'`.)
 *
 * @qkey {Dictionary?} criteria
 *
 * @qkey {Dictionary?} meta
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function sum() {


  //  ██████╗ ███████╗███████╗███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗
  //  ██║  ██║█████╗  █████╗  █████╗  ██████╔╝
  //  ██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗
  //  ██████╔╝███████╗██║     ███████╗██║  ██║
  //  ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
  //
  //   ██╗███╗   ███╗ █████╗ ██╗   ██╗██████╗ ███████╗██╗
  //  ██╔╝████╗ ████║██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝╚██╗
  //  ██║ ██╔████╔██║███████║ ╚████╔╝ ██████╔╝█████╗   ██║
  //  ██║ ██║╚██╔╝██║██╔══██║  ╚██╔╝  ██╔══██╗██╔══╝   ██║
  //  ╚██╗██║ ╚═╝ ██║██║  ██║   ██║   ██████╔╝███████╗██╔╝
  //   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝
  //

  if (arguments.length > 4) {
    throw new Error('Usage error: Too many arguments.');
  }

  // Build initial query keys
  var queryKeys = {
    method: 'sum',
    using: this.identity,
    meta: metaContainer
  };

  // Handle variadicity.
  switch (arguments.length) {

    // • sum()  << This is invalid usage, but we handle that later.
    case 0: break;

    case 1:

      // • sum(queryKeys)
      if (_.isObject(numericAttrName) && !_.isFunction(numericAttrName) && !_.isArray(numericAttrName)) {
        queryKeys = _.extend(arguments[0], queryKeys);
      }
      // • sum(numericAttrName)
      else {
        queryKeys.numericAttrName = arguments[0];
      }

      break;

    // • sum(numericAttrName, done)
    // • sum(numericAttrName, done, meta)
    case 2:
    case 3:
      // queryKeys.numericAttrName = arguments[0];
      // queryKeys.numericAttrName = arguments[0];
      // queryKeys.numericAttrName = arguments[0];
      // break;

      // queryKeys.numericAttrName = arguments[0];
      break;

    default:
      throw new Error('Usage error: Too many arguments.');

  }


  // Partial usage:
  // • `sum('balance', {...})`
  if (arguments.length === 1 || arguments.length === 2) {
  if (!_.isFunction(arguments[0])) {

  }
  //
  // Usage:
  // • `sum('balance', function (err){...})`
  // • `sum('balance', function (err){...}, {...})`
  //
  // Usage:
  // • `sum('balance', {...}, function (err){...})`
  // • `sum('balance', {...}, function (err){...}, {...})`
  //
  //
  // Invalid usage:
  // • `sum({...})`
  // • `sum(function (err){...})`
  // • `sum(function (err){...}, {...})`
  //

  // -> Missing first two arguments, but has callback.  (will be invalid)
  if (_.isFunction(arguments[0])) {
    done = arguments[0];
    numericAttrName = undefined;
    criteria = undefined;
  }
  // -> Missing first argument, but has callback.
  else if (_.isFunction(arguments[1])) {
    done = arguments[1];
    numericAttrName = arguments[0];
    criteria = undefined;
  }


  //  ┌┐ ┬ ┬┬┬  ┌┬┐   ┬   ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌  ┌┐┌┌─┐┬ ┬  ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┌┬┐
  //  ├┴┐│ │││   ││  ┌┼─  ├┬┘├┤  │ │ │├┬┘│││  │││├┤ │││   ││├┤ ├┤ ├┤ ├┬┘├┬┘├┤  ││
  //  └─┘└─┘┴┴─┘─┴┘  └┘   ┴└─└─┘ ┴ └─┘┴└─┘└┘  ┘└┘└─┘└┴┘  ─┴┘└─┘└  └─┘┴└─┴└─└─┘─┴┘
  //  ┌─    ┬┌─┐  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐    ─┐
  //  │───  │├┤   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │   ───│
  //  └─    ┴└    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴     ─┘
  // If a callback function was not specified, then build a new `Deferred` and bail now.
  //
  // > This method will be called AGAIN automatically when the Deferred is executed.
  // > and next time, it'll have a callback.
  if (arguments.length <= 2) {

    return new Deferred(this, sum, queryKeys);

  }//--•



  // Otherwise, IWMIH, we know that a callback was specified.
  // So...
  //
  //  ███████╗██╗  ██╗███████╗ ██████╗██╗   ██╗████████╗███████╗
  //  ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██║   ██║╚══██╔══╝██╔════╝
  //  █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║   ██║   █████╗
  //  ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║   ██║   ██╔══╝
  //  ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝   ██║   ███████╗
  //  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  var query = {
    method: 'sum',
    using: this.identity,

    numericAttrName: numericAttrName,
    criteria: criteria,

    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_NUMERIC_ATTR_NAME':
        return done(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'The numeric attr name (i.e. first argument) to `.sum()` should '+
              'be the name of an attribute in this model which is defined with `type: \'number\'`.\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      case 'E_INVALID_CRITERIA':
        return done(
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
        return done(e);
    }
  }//>-•


  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
  //
  return done(new Error('Not implemented yet.'));

};
