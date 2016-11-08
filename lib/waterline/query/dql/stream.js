/**
 * Module dependencies
 */

var _ = require('lodash');
var flaverr = require('flaverr');
var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');
var Deferred = require('../deferred');



/**
 * stream()
 *
 * Iterate over individual records (or batches of records) that match
 * the specified criteria, populating associations if instructed.
 *
 * ```
 * BlogPost.stream()
 *   .limit(50000)
 *   .sort('title ASC')
 *   .eachRecord(function (blogPost, next){ ... })
 *   .exec(function (err){ ... });
 *
 * // For more usage info, see:
 * // https://gist.github.com/mikermcneil/d1e612cd1a8564a79f61e1f556fc49a6#examples
 * ```
 *
 *  -------------------------------
 *  ~• This is "the new stream". •~
 *  -------------------------------
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Dictionary?} criteria
 *
 * @param {Function?} eachRecordFn
 *
 * @param {Dictionary} moreQueryKeys
 *        For internal use.
 *        (A dictionary of query keys.)
 *
 * @param {Function?} done
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no `done` callback was provided
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * The underlying query keys:
 * ==============================
 *
 * @qkey {Dictionary?} criteria
 *
 * @qkey {Dictionary?} populates
 *
 * @qkey {Function?} eachRecordFn
 *        An iteratee function to run for each record.
 *        (If specified, then `eachBatchFn` should not ALSO be set.)
 *
 * @qkey {Function?} eachBatchFn
 *        An iteratee function to run for each batch of records.
 *        (If specified, then `eachRecordFn` should not ALSO be set.)
 *
 * @qkey {Dictionary?} meta
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function stream( /* criteria?, eachRecordFn?, moreQueryKeys?, done?, meta? */ ) {


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


  // Build query w/ initial, universal keys.
  var query = {
    method: 'stream',
    using: this.identity
  };

  // The `done` callback, if one was provided.
  var done;

  // Now handle the various supported usage possibilities.
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){

    // Additional query keys.
    var moreQueryKeys;

    // The metadata container, if one was provided.
    var meta;


    // Handle double meaning of first argument:
    //
    // • stream(criteria, ...)
    if (_.isObject(args[0]) && !_.isFunction(args[0]) && !_.isArray(args[0])) {
      query.criteria = args[0];
    }
    // • stream(eachRecordFn, ...)
    else {
      query.eachRecordFn = args[0];
    }


    // Handle double meaning of second argument:
    //
    // • stream(..., moreQueryKeys, done, meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      moreQueryKeys = args[1];
      done = args[2];
      meta = args[3];
    }
    // • stream(..., eachRecordFn, ...)
    else {
      query.eachRecordFn = args[1];
    }


    // Handle double meaning of third argument:
    //
    // • stream(..., ..., moreQueryKeys, done, meta)
    var is3rdArgDictionary = (_.isObject(args[2]) && !_.isFunction(args[2]) && !_.isArray(args[2]));
    if (is3rdArgDictionary) {
      moreQueryKeys = args[2];
      done = args[3];
      meta = args[4];
    }
    // • stream(..., ..., done, meta)
    else {
      done = args[2];
      meta = args[3];
    }


    // Fold in `moreQueryKeys`, if provided.
    //
    // > Userland is prevented from overriding any of the universal keys this way.
    if (!_.isUndefined(moreQueryKeys)) {
      delete moreQueryKeys.method;
      delete moreQueryKeys.using;
      delete moreQueryKeys.meta;
      _.extend(query, moreQueryKeys);
    }//>-


    // Fold in `meta`, if provided.
    if (!_.isUndefined(meta)) {
      query.meta = meta;
    }//>-

  })();


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
  if (!done) {
    return new Deferred(this, stream, query);
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
  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_STREAM_ITERATEE':
        return done(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'An iteratee function (or "cursor") should be passed in to `.stream()` via either ' +
              '`.eachRecord()` or `eachBatch()` -- but not both.\n' +
              'Details:\n' +
              '  ' + e.message + '\n'
            )
          )
        );

      case 'E_INVALID_CRITERIA':
        return done(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid criteria.\n' +
              'Details:\n' +
              '  ' + e.message + '\n'
            )
          )
        );

      case 'E_INVALID_POPULATES':
        return done(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid populate(s).\n' +
              'Details:\n' +
              '  ' + e.message + '\n'
            )
          )
        );

      default:
        return done(e);
    }
  } //>-•


  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
  //
  //
  // - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - -
  // This is specced out (and mostly implemented) here:
  // https://gist.github.com/mikermcneil/d1e612cd1a8564a79f61e1f556fc49a6
  // - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - -
  return done(new Error('Not implemented yet.'));
  // - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - -
  // - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - - - - - • - - -

};


