/**
 * Module Dependencies
 */

var _ = require('@sailshq/lodash');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');


/**
 * createEach()
 *
 * Create a set of records in the database.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Array?} newRecords
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
 */

module.exports = function createEach( /* newRecords?, done?, meta? */ ) {

  // Build query w/ initial, universal keys.
  var query = {
    method: 'createEach',
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
  // (locate the `done` callback)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){

    // The metadata container, if one was provided.
    var _meta;


    // Handle first argument:
    //
    // • createEach(newRecords, ...)
    query.newRecords = args[0];

    // • createEach(..., done, _meta)
    done = args[1];
    _meta = args[2];

    // Fold in `_meta`, if relevant.
    if (_meta) {
      query.meta = _meta;
    } // >-

  })();


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
    return new Deferred(this, createEach, query);
  } // --•


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

      case 'E_INVALID_NEW_RECORDS':
      case 'E_INVALID_META':
        return done(e);
        // ^ when the standard usage error is good enough as-is, without any further customization

      default:
        return done(e);
        // ^ when an internal, miscellaneous, or unexpected error occurs
    }
  } // >-•


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─┌─┐
  //  ╠═╣╠═╣║║║ ║║║  ║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐└─┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴└─┘
  // Determine what to do about running any lifecycle callbacks
  // TODO


  //  ████████╗██╗███╗   ███╗███████╗███████╗████████╗ █████╗ ███╗   ███╗██████╗ ███████╗
  //  ╚══██╔══╝██║████╗ ████║██╔════╝██╔════╝╚══██╔══╝██╔══██╗████╗ ████║██╔══██╗██╔════╝
  //     ██║   ██║██╔████╔██║█████╗  ███████╗   ██║   ███████║██╔████╔██║██████╔╝███████╗
  //     ██║   ██║██║╚██╔╝██║██╔══╝  ╚════██║   ██║   ██╔══██║██║╚██╔╝██║██╔═══╝ ╚════██║
  //     ██║   ██║██║ ╚═╝ ██║███████╗███████║   ██║   ██║  ██║██║ ╚═╝ ██║██║     ███████║
  //     ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚══════╝
  //
  // Attach any generated timestamps to the records before they are turned into
  // stage three queries.

  // Generate the timestamps so that both createdAt and updatedAt have the
  // same initial value.
  var self = this;
  var numDate = Date.now();
  var strDate = new Date();

  _.each(query.newRecords, function(record) {
    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
    _.each(self.attributes, function(val, name) {
      if (_.has(val, 'autoCreatedAt') && val.autoCreatedAt) {
        var attributeVal;

        // Check the type to determine which type of value to generate
        if (val.type === 'number') {
          attributeVal = numDate;
        } else {
          attributeVal = strDate;
        }

        if (!record[name]) {
          record[name] = attributeVal;
        }
      }
    });


    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
    _.each(self.attributes, function(val, name) {
      if (_.has(val, 'autoUpdatedAt') && val.autoUpdatedAt) {
        var attributeVal;

        // Check the type to determine which type of value to generate
        if (val.type === 'number') {
          attributeVal = numDate;
        } else {
          attributeVal = strDate;
        }

        if (!record[name]) {
          record[name] = attributeVal;
        }
      }
    });
  });


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  var stageThreeQuery;
  try {
    stageThreeQuery = forgeStageThreeQuery({
      stageTwoQuery: query,
      identity: this.identity,
      transformer: this._transformer,
      originalModels: this.waterline.collections
    });
  } catch (e) {
    return done(e);
  }


  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘

  // Grab the adapter to perform the query on
  var connectionName = this.adapterDictionary.createEach;
  if (!connectionName) {
    return done(new Error('The adapter used in the ' + this.identity + ' model doesn\'t support the `createEach` method.)'));
  }

  // Grab the adapter
  var adapter = this.connections[connectionName].adapter;

  // Run the operation
  adapter.createEach(connectionName, stageThreeQuery, function(err, values) {
    if (err) {
      return done(err);
    }

    //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
    //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │  ├┬┘├┤ ├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
    //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
    // TODO

    return done(undefined, values);
  }, query.meta);
};
