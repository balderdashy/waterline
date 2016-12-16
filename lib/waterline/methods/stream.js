/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var flaverr = require('flaverr');
var getModel = require('../utils/ontology/get-model');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var Deferred = require('../utils/query/deferred');


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
 * // For more usage info (/history), see:
 * // https://gist.github.com/mikermcneil/d1e612cd1a8564a79f61e1f556fc49a6#examples
 * ```
 *
 *  ----------------------------------
 *  ~• This is the "new .stream()". •~
 *  ----------------------------------
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
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function stream( /* criteria?, eachRecordFn?, moreQueryKeys?, done?, meta? */ ) {

  // A reference to the `orm` instance, for convenience.
  var orm = this.waterline;

  // Build query w/ initial, universal keys.
  var query = {
    method: 'stream',
    using: this.identity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //

  // The `done` callback, if one was provided.
  var done;

  // Handle the various supported usage possibilities
  // (locate the `done` callback, and extend the `query` dictionary)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){

    // Additional query keys.
    var _moreQueryKeys;

    // The metadata container, if one was provided.
    var _meta;


    // Handle double meaning of first argument:
    //
    // • stream(criteria, ...)
    var is1stArgDictionary = (_.isObject(args[0]) && !_.isFunction(args[0]) && !_.isArray(args[0]));
    if (is1stArgDictionary) {
      query.criteria = args[0];
    }
    // • stream(eachRecordFn, ...)
    else {
      query.eachRecordFn = args[0];
    }


    // Handle double meaning of second argument:
    //
    // • stream(..., _moreQueryKeys, done, _meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      _moreQueryKeys = args[1];
      done = args[2];
      _meta = args[3];
    }
    // • stream(..., eachRecordFn, ...)
    else {
      query.eachRecordFn = args[1];
    }


    // Handle double meaning of third argument:
    //
    // • stream(..., ..., _moreQueryKeys, done, _meta)
    var is3rdArgDictionary = (_.isObject(args[2]) && !_.isFunction(args[2]) && !_.isArray(args[2]));
    if (is3rdArgDictionary) {
      _moreQueryKeys = args[2];
      done = args[3];
      _meta = args[4];
    }
    // • stream(..., ..., done, _meta)
    else {
      done = args[2];
      _meta = args[3];
    }


    // Fold in `_moreQueryKeys`, if provided.
    //
    // > Userland is prevented from overriding any of the universal keys this way.
    if (_moreQueryKeys) {
      delete _moreQueryKeys.method;
      delete _moreQueryKeys.using;
      delete _moreQueryKeys.meta;
      _.extend(query, _moreQueryKeys);
    }//>-


    // Fold in `_meta`, if provided.
    if (_meta) {
      query.meta = _meta;
    }//>-

  })();//</self-calling function :: handleVariadicUsage()>




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
    forgeStageTwoQuery(query, orm);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_STREAM_ITERATEE':
        return done(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Invalid iteratee function passed in to `.stream()` via `.eachRecord()` or `.eachBatch()`.\n'+
              'Details:\n' +
              '  ' + e.details + '\n'
            )
          )
        );

      case 'E_INVALID_CRITERIA':
      case 'E_INVALID_POPULATES':
      case 'E_INVALID_META':
        return done(e);
        // ^ when the standard usage error is good enough as-is, without any further customization

      case 'E_NOOP':
        return done(undefined, []);

      default:
        return done(e);
        // ^ when an internal, miscellaneous, or unexpected error occurs

    }
  } //>-•



  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
  //

  // Look up relevant model.
  var RelevantModel = getModel(query.using, orm);

  // When running a `.stream()`, Waterline grabs pages (batches) of like 30 records at a time.
  // This is not currently configurable.
  //
  // > If you have a use case for changing this page size (batch size) dynamically, please
  // > create an issue with a detailed explanation.  Wouldn't be hard to add, we just
  // > haven't run across a need to change it yet.
  var BATCH_SIZE = 30;

  // A flag that will be set to true after we've reached the VERY last batch.
  var reachedLastBatch;

  // The index of the current batch.
  var i = 0;

  async.whilst(function test(){
    // console.log('tsting');
    if (!reachedLastBatch) { return true; }
    else { return false; }
  }, function beginNextBatchMaybe(next) {


    // 0   => 15
    // 15  => 15
    // 30  => 15
    // 45  => 5
    // 50
    var numRecordsLeftUntilAbsLimit = query.criteria.limit - ( i*BATCH_SIZE );
    var limitForThisBatch = Math.min(numRecordsLeftUntilAbsLimit, BATCH_SIZE);
    var skipForThisBatch = query.criteria.skip +  ( i*BATCH_SIZE );
    //                     |_initial offset    +  |_relative offset from end of previous batch


    // If we've exceeded the absolute limit, then we go ahead and stop.
    if (limitForThisBatch <= 0) {
      reachedLastBatch = true;
      return next();
    }//-•

    // Build the criteria + deferred object to do a `.find()` for this batch.
    var criteriaForThisBatch = {
      skip: skipForThisBatch,
      limit: limitForThisBatch,
      sort: query.criteria.sort,
      select: query.criteria.select,
      where: query.criteria.where
    };
    // console.log('---iterating---');
    // console.log('i:',i);
    // console.log('   BATCH_SIZE:',BATCH_SIZE);
    // console.log('   query.criteria.limit:',query.criteria.limit);
    // console.log('   query.criteria.skip:',query.criteria.skip);
    // console.log('   query.criteria.sort:',query.criteria.sort);
    // console.log('   query.criteria.where:',query.criteria.where);
    // console.log('   query.criteria.select:',query.criteria.select);
    // console.log('   --');
    // console.log('   criteriaForThisBatch.limit:',criteriaForThisBatch.limit);
    // console.log('   criteriaForThisBatch.skip:',criteriaForThisBatch.skip);
    // console.log('   criteriaForThisBatch.sort:',criteriaForThisBatch.sort);
    // console.log('   criteriaForThisBatch.where:',criteriaForThisBatch.where);
    // console.log('   criteriaForThisBatch.select:',criteriaForThisBatch.select);
    // console.log('---•••••••••---');
    var deferredForThisBatch = RelevantModel.find(criteriaForThisBatch);

    _.each(query.populates, function (assocCriteria, assocName){
      deferredForThisBatch = deferredForThisBatch.populate(assocName, assocCriteria);
    });

    deferredForThisBatch.exec(function (err, batchOfRecords){
      if (err) { return next(err); }

      // If there were no records returned, then we have already reached the last batch of results.
      // (i.e. it was the previous batch-- since this batch was empty)
      // In this case, we'll set the `reachedLastBatch` flag and trigger our callback,
      // allowing `async.whilst()` to call _its_ callback, which will pass control back
      // to userland.
      if (batchOfRecords.length === 0) {
        reachedLastBatch = true;
        return next();
      }// --•

      // But otherwise, we need to go ahead and call the appropriate
      // iteratee for this batch.  If it's eachBatchFn, we'll call it
      // once.  If it's eachRecordFn, we'll call it once per record.
      (function _makeCallOrCallsToAppropriateIteratee(proceed){

        // If an `eachBatchFn` iteratee was provided, we'll call it.
        // > At this point we already know it's a function, because
        // > we validated usage at the very beginning.
        if (query.eachBatchFn) {

          // Note that, if you try to call next() more than once in the iteratee, Waterline
          // logs a warning explaining what's up, ignoring all subsequent calls to next()
          // that occur after the first.
          var didIterateeAlreadyHalt;
          try {
            query.eachBatchFn(batchOfRecords, function (err) {
              if (err) { return proceed(err); }

              if (didIterateeAlreadyHalt) {
                console.warn(
                  'Warning: The per-batch iteratee provided to `.stream()` triggered its callback \n'+
                  'again-- after already triggering it once!  Please carefully check your iteratee\'s \n'+
                  'code to figure out why this is happening.  (Ignoring this subsequent invocation...)'
                );
                return;
              }//-•

              didIterateeAlreadyHalt = true;

              return proceed();
            });//</ invoked per-batch iteratee >
          } catch (e) { return proceed(e); }//>-•

          return;
        }//--•


        // Otherwise `eachRecordFn` iteratee must have been provided.
        // We'll call it once per record in this batch.
        // > We validated usage at the very beginning, so we know that
        // > one or the other iteratee must have been provided as a
        // > valid function if we made it here.
        async.eachSeries(batchOfRecords, function (record, next) {

          // Note that, if you try to call next() more than once in the iteratee, Waterline
          // logs a warning explaining what's up, ignoring all subsequent calls to next()
          // that occur after the first.
          var didIterateeAlreadyHalt;
          try {
            query.eachRecordFn(batchOfRecords, function (err) {
              if (err) { return next(err); }

              if (didIterateeAlreadyHalt) {
                console.warn(
                  'Warning: The per-record iteratee provided to `.stream()` triggered its callback\n'+
                  'again-- after already triggering it once!  Please carefully check your iteratee\'s\n'+
                  'code to figure out why this is happening.  (Ignoring this subsequent invocation...)'
                );
                return;
              }//-•

              didIterateeAlreadyHalt = true;

              return next();

            });//</ invoked per-record iteratee >
          } catch (e) { return next(e); }

        }, function (err) {
          if (err) { return proceed(err); }

          return proceed();

        });//</async.eachSeries()>

      })(function (err){
        if (err) {

          // Since this `err` might have come from the userland iteratee,
          // we can't completely trust it.  So check it out, and if it's
          // not one already, convert `err` into Error instance.
          if (!_.isError(err)) {
            if (_.isString(err)) {
              err = new Error(err);
            }
            else {
              err = new Error(util.inspect(err, {depth:5}));
            }
          }//>-

          return next(err);
        }//--•

        // Increment the batch counter.
        i++;

        // On to the next batch!
        return next();

      });//</self-calling function :: process this batch by making either one call or multiple calls to the appropriate iteratee>

    });//</deferredForThisBatch.exec()>

  }, function (err) {
    if (err) { return done(err); }//-•

    // console.log('finished `.whilst()` successfully');
    return done();

  });//</async.whilst()>

};




/**
 * ad hoc demonstration...
 */

/*```
theOrm = { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: false}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } };
// ^^ except use a real ORM instance
testStream = require('./lib/waterline/methods/stream');
testStream = require('@sailshq/lodash').bind(testStream, { waterline: theOrm, identity: 'user' });
testStream({}, function (record, next){  return next();  }, console.log)
```*/

