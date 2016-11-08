/**
 * Module dependencies
 */

var _ = require('lodash');
var Deferred = require('../deferred');


/**
 * stream()
 *
 * Replace all members of the specified collection in each of the target record(s).
 *
 * ```
 * BlogPost.stream()
 *   .limit(50000)
 *   .sort('title ASC')
 *   .eachRecord(function (blogPost, next){ ... });
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
 * @param {Dictionary?} criteria
 *
 * @param {Dictionary?} populates
 *
 * @param {Function?} eachRecordFn
 *        An iteratee function to run for each record.
 *        (If specified, then `eachBatchFn` should not ALSO be set.)
 *
 * @param {Function?} eachBatchFn
 *        An iteratee function to run for each batch of records.
 *        (If specified, then `eachRecordFn` should not ALSO be set.)
 *
 * @param {Function?} done
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead.)
 *
 * @param {Ref?} metaContainer
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no callback
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

 module.exports = function stream(criteria, populates, eachRecordFn, eachBatchFn, done, metaContainer) {


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

   if (arguments.length > 6) {
     throw new Error('Usage error: Too many arguments.');
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
   if (arguments.length <= 4) {

      return new Deferred(this, stream, {
        method: 'stream',

        criteria: criteria,
        populates: populates,
        eachRecordFn: eachRecordFn,
        eachBatchFn: eachBatchFn,

        meta: metaContainer
      });

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
     method: 'stream',
     using: this.identity,

     criteria: criteria,
     populates: populates,
     eachRecordFn: eachRecordFn,
     eachBatchFn: eachBatchFn,

     meta: metaContainer
   };

   try {
     forgeStageTwoQuery(query, this.waterline);
   } catch (e) {
     switch (e.code) {

       case 'E_INVALID_STREAM_ITERATEE':
         return done(
           flaverr(
             { name: 'Usage error' },
             new Error(
               'An iteratee function (or "cursor") should be passed in to `.stream()` via either '+
               '`.eachRecord()` or `eachBatch()` -- but not both.\n'+
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
