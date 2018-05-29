/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var async = require('async');
var flaverr = require('flaverr');
var parley = require('parley');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');

/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('stream');
var STRIP_COMMENTS_RX = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;



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
 * @param {Function?} explicitCbMaybe
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @param {Dictionary} moreQueryKeys
 *        For internal use.
 *        (A dictionary of query keys.)
 *
 * @returns {Ref?} Deferred object if no `explicitCbMaybe` callback was provided
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

module.exports = function stream( /* criteria?, eachRecordFn?, explicitCbMaybe?, meta?, moreQueryKeys? */ ) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Potentially build an omen here for potential use in an
  // asynchronous callback below if/when an error occurs.  This would
  // provide for a better stack trace, since it would be based off of
  // the original method call, rather than containing extra stack entries
  // from various utilities calling each other within Waterline itself.
  //
  // > Note that it'd need to be passed in to the other model methods that
  // > get called internally.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Build query w/ initial, universal keys.
  var query = {
    method: 'stream',
    using: modelIdentity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //

  // The `explicitCbMaybe` callback, if one was provided.
  var explicitCbMaybe;

  // Handle the various supported usage possibilities
  // (locate the `explicitCbMaybe` callback, and extend the `query` dictionary)
  //
  // > Note that we define `args` to minimize the chance of this "variadics" code
  // > introducing any unoptimizable performance problems.  For details, see:
  // > https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
  // > •=> `.length` is just an integer, this doesn't leak the `arguments` object itself
  // > •=> `i` is always valid index in the arguments object
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }

  // • stream(eachRecordFn, ..., ..., ...)
  // • stream(eachRecordFn, explicitCbMaybe, ..., ...)
  if (args.length >= 1 && _.isFunction(args[0])) {
    query.eachRecordFn = args[0];
    explicitCbMaybe = args[1];
    query.meta = args[2];
    if (args[3]) {
      _.extend(query, args[3]);
    }
  }
  // • stream(criteria, ..., ..., ..., ...)
  // • stream(criteria, eachRecordFn, ..., ..., ...)
  // • stream()
  else {
    query.criteria = args[0];
    query.eachRecordFn = args[1];
    explicitCbMaybe = args[2];
    query.meta = args[3];
    if (args[4]) {
      _.extend(query, args[4]);
    }
  }




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
  // If an explicit callback function was specified, then immediately run the logic below
  // and trigger the explicit callback when the time comes.  Otherwise, build and return
  // a new Deferred now. (If/when the Deferred is executed, the logic below will run.)
  return parley(

    function (done){

      // Otherwise, IWMIH, we know that it's time to actually do some stuff.
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
                {
                  name: 'UsageError',
                  code: e.code,
                  details: e.details,
                },
                new Error(
                  'Missing or invalid iteratee function for `.stream()`.\n'+
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
            return done();

          default:
            return done(e);
            // ^ when an internal, miscellaneous, or unexpected error occurs

        }
      } //>-•



      //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
      //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
      //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
      //
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


      async.whilst(function _checkHasntReachedLastBatchYet(){
        if (!reachedLastBatch) { return true; }
        else { return false; }
      },// ~∞%°
      function _beginBatchMaybe(next) {

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
          omit: query.criteria.omit,
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
        // console.log('   query.criteria.omit:',query.criteria.omit);
        // console.log('   --');
        // console.log('   criteriaForThisBatch.limit:',criteriaForThisBatch.limit);
        // console.log('   criteriaForThisBatch.skip:',criteriaForThisBatch.skip);
        // console.log('   criteriaForThisBatch.sort:',criteriaForThisBatch.sort);
        // console.log('   criteriaForThisBatch.where:',criteriaForThisBatch.where);
        // console.log('   criteriaForThisBatch.select:',criteriaForThisBatch.select);
        // console.log('   criteriaForThisBatch.omit:',criteriaForThisBatch.omit);
        // console.log('---•••••••••---');
        var deferredForThisBatch = WLModel.find(criteriaForThisBatch);

        _.each(query.populates, function (assocCriteria, assocName){
          deferredForThisBatch = deferredForThisBatch.populate(assocName, assocCriteria);
        });

        // Pass through `meta` so we're sure to use the same db connection
        // and settings (i.e. esp. relevant if we happen to be inside a transaction)
        deferredForThisBatch.meta(query.meta);

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

            // Check if the iteratee declares a callback parameter
            var seemsToExpectCallback = (function(){
              var fn = query.eachBatchFn || query.eachRecordFn;
              var fnStr = fn.toString().replace(STRIP_COMMENTS_RX, '');
              var parametersAsString = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')'));
              // console.log(':seemsToExpectCallback:',parametersAsString, !!parametersAsString.match(/\,\s*([^,\{\}\[\]\s]+)\s*$/));
              return !! parametersAsString.match(/\,\s*([^,\{\}\[\]\s]+)\s*$/);
            })();//†

            // If an `eachBatchFn` iteratee was provided, we'll call it.
            // > At this point we already know it's a function, because
            // > we validated usage at the very beginning.
            if (query.eachBatchFn) {

              // Note that, if you try to call next() more than once in the iteratee, Waterline
              // logs a warning explaining what's up, ignoring all subsequent calls to next()
              // that occur after the first.
              var didIterateeAlreadyHalt;
              try {
                var promiseMaybe = query.eachBatchFn(batchOfRecords, function (err) {
                  if (!seemsToExpectCallback) { return proceed(new Error('Unexpected attempt to invoke callback.  Since this per-batch iteratee function does not appear to expect a callback parameter, this stub callback was provided instead.  Please either explicitly list the callback parameter among the arguments or change this code to no longer use a callback.')); }//•
                  if (err) { return proceed(err); }//•
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
                });//_∏_  </ invoked per-batch iteratee >

                // Take care of unhandled promise rejections from `await` (if appropriate)
                if (query.eachBatchFn.constructor.name === 'AsyncFunction') {
                  if (!seemsToExpectCallback) {
                    promiseMaybe = promiseMaybe.then(function(){
                      didIterateeAlreadyHalt = true;
                      proceed();
                    });//_∏_
                  }//ﬁ
                  promiseMaybe.catch(function(e){ proceed(e); });//_∏_
                } else {
                  if (!seemsToExpectCallback) {
                    didIterateeAlreadyHalt = true;
                    return proceed();
                  }
                }

              } catch (e) { return proceed(e); }//>-•

              return;
            }//_∏_.


            // Otherwise `eachRecordFn` iteratee must have been provided.
            // We'll call it once per record in this batch.
            // > We validated usage at the very beginning, so we know that
            // > one or the other iteratee must have been provided as a
            // > valid function if we made it here.
            async.eachSeries(batchOfRecords, function _eachRecordInBatch(record, next) {
              // Note that, if you try to call next() more than once in the iteratee, Waterline
              // logs a warning explaining what's up, ignoring all subsequent calls to next()
              // that occur after the first.
              var didIterateeAlreadyHalt;
              try {
                var promiseMaybe = query.eachRecordFn(record, function (err) {
                  if (!seemsToExpectCallback) { return next(new Error('Unexpected attempt to invoke callback.  Since this per-record iteratee function does not appear to expect a callback parameter, this stub callback was provided instead.  Please either explicitly list the callback parameter among the arguments or change this code to no longer use a callback.')); }//•
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

                });//_∏_  </ invoked per-record iteratee >

                // Take care of unhandled promise rejections from `await` (if appropriate)
                if (query.eachRecordFn.constructor.name === 'AsyncFunction') {
                  if (!seemsToExpectCallback) {
                    promiseMaybe = promiseMaybe.then(function(){
                      didIterateeAlreadyHalt = true;
                      next();
                    });//_∏_
                  }//ﬁ
                  promiseMaybe.catch(function(e){ next(e); });//_∏_
                } else {
                  if (!seemsToExpectCallback) {
                    didIterateeAlreadyHalt = true;
                    return next();
                  }
                }//ﬂ

              } catch (e) { return next(e); }

            },// ~∞%°
            function _afterIteratingOverRecordsInBatch(err) {
              if (err) { return proceed(err); }

              return proceed();

            });//</async.eachSeries()>

          })(function _afterCallingIteratee(err){
            if (err) {
              return next(err);
            }

            // Increment the batch counter.
            i++;

            // On to the next batch!
            return next();

          });//</self-calling function :: process this batch by making either one call or multiple calls to the appropriate iteratee>

        });//</deferredForThisBatch.exec()>

      },// ~∞%°
      function _afterAsyncWhilst(err) {
        if (err) { return done(err); }//-•

        // console.log('finished `.whilst()` successfully');
        return done();

      });//</async.whilst()>

    },


    explicitCbMaybe,


    _.extend(DEFERRED_METHODS, {

      // Provide access to this model for use in query modifier methods.
      _WLModel: WLModel,

      // Set up initial query metadata.
      _wlQueryInfo: query,

    })

  );//</parley>

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


// Or using `sails console` in a sample app:
// ```
// Product.stream({where: {luckyNumber: 29}}).eachBatch(function(record, next){console.log('batch:', record); return next(); }).then(function(){ console.log('ok.', arguments); }).catch(function(){ console.log('uh oh!!!!', arguments); })
// ```
