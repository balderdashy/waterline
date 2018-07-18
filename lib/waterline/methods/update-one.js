/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('updateOne');



/**
 * updateOne()
 *
 * Update a single record that matches the specified criteria, patching it with
 * the provided values and returning the updated record.
 *
 * @experimental
 *
 * TODO: document further
 */

module.exports = function updateOne(criteria, valuesToSet, explicitCbMaybe, metaContainer) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Potentially build an omen for use below.
  var omenMaybe = flaverr.omen(updateOne);

  // Build initial query.
  var query = {
    method: 'updateOne',
    using: modelIdentity,
    criteria: criteria,
    valuesToSet: valuesToSet,
    meta: metaContainer
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // N/A
  // (there are no out-of-order, optional arguments)



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
  // If a callback function was not specified, then build a new Deferred and bail now.
  //
  // > This method will be called AGAIN automatically when the Deferred is executed.
  // > and next time, it'll have a callback.
  return parley(

    function (done){

      // Otherwise, IWMIH, we know that a callback was specified.
      // So...

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
      // This ensures a normalized format.

      try {
        forgeStageTwoQuery(query, orm);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID_CRITERIA':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Invalid criteria.\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omenMaybe)
            );

          case 'E_INVALID_VALUES_TO_SET':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Cannot perform update with the provided values.\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omenMaybe)
            );

          case 'E_NOOP':
            var noopResult = undefined;
            return done(undefined, noopResult);

          default:
            return done(e);
        }
      }

      // Do a .count() to ensure that there are ≤1 matching records.
      // FUTURE: Make this transactional, if supported by the underlying adapter.
      var modifiedCriteriaForCount = _.omit(query.criteria, ['select', 'omit', 'limit', 'skip', 'sort']);
      WLModel.count(modifiedCriteriaForCount, function _afterCounting(err, total) {
        if (err) {
          return done(err);
        }

        // If more than one matching record was found, then consider this an error.
        if (total > 1) {
          return done(flaverr({
            message:
            'Preventing `.'+query.method+'()`: found too many ('+total+') matching records.\n'+
            '\n'+
            'Criteria used:\n'+
            '···\n'+
            util.inspect(modifiedCriteriaForCount,{depth:5})+'\n'+
            '···'
          }, omenMaybe));
        }//-•

        // Build a modified shallow clone of the originally-provided `meta` from
        // userland, but that also has `fetch: true` and the private/experimental
        // flag, `skipEncryption: true`.  For context on the bit about encryption,
        // see: https://github.com/balderdashy/sails/issues/4302#issuecomment-363883885
        // > PLEASE DO NOT RELY ON `skipEncryption` IN YOUR OWN CODE- IT COULD CHANGE
        // > AT ANY TIME AND BREAK YOUR APP OR PLUGIN!
        var modifiedMetaForUpdate = _.extend({}, query.meta || {}, {
          fetch: true,
          skipEncryption: true
        });

        var modifiedCriteriaForUpdate = _.omit(query.criteria, ['select', 'omit', 'limit', 'skip', 'sort']);
        WLModel.update(modifiedCriteriaForUpdate, query.valuesToSet, function _afterUpdating(err, affectedRecords) {
          if (err) {
            return done(err);
          }

          // Note that we always get `affectedRecords` here because "fetch" is enabled.
          return done(undefined, affectedRecords[0]);

        }, modifiedMetaForUpdate);//_∏_  </.update()>
      }, query.meta);//_∏_  </.count()>
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
