/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('../ontology/get-model');


/**
 * forgeAdapterError()
 *
 * Given a raw error from the adapter, convert it into a normalized, higher-level Error instance
 * with a better stack trace.
 *
 * > This includes potentially examining its `footprint` property.
 * > For more info on the lower-level driver specification, from whence this error originates, see:
 * > https://github.com/treelinehq/waterline-query-docs/blob/a0689b6a6536a3c196dff6a9528f2ef72d4f6b7d/docs/errors.md#notunique
 * >
 * > Note that after calling this utility, the provided `omen` must NEVER BE USED AGAIN!
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Ref} originalError        [The original error from the adapter]
 * @param {Ref} omen                 [Used purely for improving the quality of the stack trace.  Should be an error instance, preferably w/ its stack trace already adjusted.]
 * @param {String} modelIdentity     [The identity of the originating model]
 * @param {Ref} orm                  [The current ORM instance]
 *
 * @returns {Error} the new error
 *                      @property {Ref} raw               [The original error, just as it came]
 *                      @property {String} modelIdentity  [The identity of the originating model]
 *                      @property {Function?} toJSON      [Might be included, but only if this is a recognized error]
 *                      @property {String?} code          [Might be included, but only if this is a recognized error (e.g. "E_UNIQUE")]
 *                      @property {Array?} attrNames      [Might be included if this is an E_UNIQUE error]
 *                                @of {String}
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function forgeAdapterError(err, omen, modelIdentity, orm){

  // Sanity checks
  assert(err, 'Should never call `forgeAdapterError` with a falsy first argument!');
  assert(_.isError(omen), 'An already-set-up, generic uniqueness error should be provided (in the second argument) to this utility.  This is for use as an omen, to improve the quality of the stack trace.  But instead, got: '+util.inspect(omen, {depth:5})+'');

  // Look up model.
  var WLModel = getModel(modelIdentity, orm);

  // Call a self-invoking function which determines the customizations that we'll need
  // to fold into this particular adapter error below.
  var customizations = (function(){

    //  ███╗   ██╗ ██████╗ ████████╗     █████╗ ███╗   ██╗    ███████╗██████╗ ██████╗  ██████╗ ██████╗
    //  ████╗  ██║██╔═══██╗╚══██╔══╝    ██╔══██╗████╗  ██║    ██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
    //  ██╔██╗ ██║██║   ██║   ██║       ███████║██╔██╗ ██║    █████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
    //  ██║╚██╗██║██║   ██║   ██║       ██╔══██║██║╚██╗██║    ██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
    //  ██║ ╚████║╚██████╔╝   ██║       ██║  ██║██║ ╚████║    ███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
    //  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
    //
    // If the incoming `err` is not an error instance, then handle it as a special case.
    // (this should never happen)
    if (!_.isError(err)) {
      return {
        message: 'Malformed error from adapter: Should always be an Error instance, but instead, got:\n'+
        '```\n'+
        util.inspect(err, {depth:5})+'\n'+
        '```'
      };
    }//-•


    // IWMIH, it's a valid Error instance.

    //  ███╗   ███╗██╗███████╗███████╗██╗███╗   ██╗ ██████╗
    //  ████╗ ████║██║██╔════╝██╔════╝██║████╗  ██║██╔════╝
    //  ██╔████╔██║██║███████╗███████╗██║██╔██╗ ██║██║  ███╗
    //  ██║╚██╔╝██║██║╚════██║╚════██║██║██║╚██╗██║██║   ██║
    //  ██║ ╚═╝ ██║██║███████║███████║██║██║ ╚████║╚██████╔╝
    //  ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝
    //
    //  ███████╗ ██████╗  ██████╗ ████████╗██████╗ ██████╗ ██╗███╗   ██╗████████╗
    //  ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝
    //  █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝██████╔╝██║██╔██╗ ██║   ██║
    //  ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║
    //  ██║     ╚██████╔╝╚██████╔╝   ██║   ██║     ██║  ██║██║██║ ╚████║   ██║
    //  ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝
    //
    // If it doesn't have a footprint, then this is some miscellaneous error from the adapter.
    // Still, wrap it up before sending it back.
    if (!err.footprint) {
      return {
        message: 'Unexpected error from database adapter: '+err.message
      };
    }//-•


    //  ██╗███╗   ██╗██╗   ██╗ █████╗ ██╗     ██╗██████╗
    //  ██║████╗  ██║██║   ██║██╔══██╗██║     ██║██╔══██╗
    //  ██║██╔██╗ ██║██║   ██║███████║██║     ██║██║  ██║
    //  ██║██║╚██╗██║╚██╗ ██╔╝██╔══██║██║     ██║██║  ██║
    //  ██║██║ ╚████║ ╚████╔╝ ██║  ██║███████╗██║██████╔╝
    //  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝╚═════╝
    //
    //  ███████╗ ██████╗  ██████╗ ████████╗██████╗ ██████╗ ██╗███╗   ██╗████████╗
    //  ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝
    //  █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝██████╔╝██║██╔██╗ ██║   ██║
    //  ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║
    //  ██║     ╚██████╔╝╚██████╔╝   ██║   ██║     ██║  ██║██║██║ ╚████║   ██║
    //  ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝
    //
    // If it has an invalid footprint (not a dictionary, or missing the fundamentals),
    // then handle it as a special case.  This should never happen.
    if (!_.isObject(err.footprint) || !_.isString(err.footprint.identity) || err.footprint.identity === '') {
      return {
        message: 'Malformed error from adapter: If Error has a `footprint`, it should be a dictionary '+
        'with a valid `identity`.  But instead, the error\'s `footprint` is:\n'+
        '```\n'+
        util.inspect(err.footprint, {depth:5})+'\n'+
        '```'
      };
    }//-•



    // IWMIH, it's an Error instance with a superficially-valid footprint.
    switch (err.footprint.identity) {

      //  ███╗   ██╗ ██████╗ ████████╗    ██╗   ██╗███╗   ██╗██╗ ██████╗ ██╗   ██╗███████╗
      //  ████╗  ██║██╔═══██╗╚══██╔══╝    ██║   ██║████╗  ██║██║██╔═══██╗██║   ██║██╔════╝
      //  ██╔██╗ ██║██║   ██║   ██║       ██║   ██║██╔██╗ ██║██║██║   ██║██║   ██║█████╗
      //  ██║╚██╗██║██║   ██║   ██║       ██║   ██║██║╚██╗██║██║██║▄▄ ██║██║   ██║██╔══╝
      //  ██║ ╚████║╚██████╔╝   ██║       ╚██████╔╝██║ ╚████║██║╚██████╔╝╚██████╔╝███████╗
      //  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝        ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚══▀▀═╝  ╚═════╝ ╚══════╝
      //
      // If this appears to be a uniqueness constraint violation error, then...
      case 'notUnique': return (function(){

        //  ┌─┐┌─┐┌─┐┌┬┐┌─┐┬─┐┬┌┐┌┌┬┐  ┬┌─┐  ┌┬┐┬┌─┐┌─┐┬┌┐┌┌─┐  ╦╔═╔═╗╦ ╦╔═╗
        //  ├┤ │ ││ │ │ ├─┘├┬┘││││ │   │└─┐  ││││└─┐└─┐│││││ ┬  ╠╩╗║╣ ╚╦╝╚═╗
        //  └  └─┘└─┘ ┴ ┴  ┴└─┴┘└┘ ┴   ┴└─┘  ┴ ┴┴└─┘└─┘┴┘└┘└─┘  ╩ ╩╚═╝ ╩ ╚═╝
        if (!_.isArray(err.footprint.keys)) {
          return {
            message: 'Malformed error from adapter: Since `footprint.identity` is "notUnique", '+
            'this error\'s footprint should have an array of `keys`!  But instead, the error\'s '+
            '`footprint.keys` is:\n'+
            '```\n'+
            util.inspect(err.footprint.keys, {depth:5})+'\n'+
            '```',
          };
        }//-•

        // But otherwise, it looks good, so we'll go on to forge it into a uniqueness error.


        //  ┌─┐┌─┐┌─┐┌┬┐┌─┐┬─┐┬┌┐┌┌┬┐  ┬┌─┐  ┌─┐┬─┐┌─┐┌─┐┌─┐┬─┐┬ ┬ ┬  ┌─┐┌─┐┬─┐┌┬┐┌─┐┌┬┐┌┬┐┌─┐┌┬┐
        //  ├┤ │ ││ │ │ ├─┘├┬┘││││ │   │└─┐  ├─┘├┬┘│ │├─┘├┤ ├┬┘│ └┬┘  ├┤ │ │├┬┘│││├─┤ │  │ ├┤  ││
        //  └  └─┘└─┘ ┴ ┴  ┴└─┴┘└┘ ┴   ┴└─┘  ┴  ┴└─└─┘┴  └─┘┴└─┴─┘┴   └  └─┘┴└─┴ ┴┴ ┴ ┴  ┴ └─┘─┴┘
        // Determine the standard customizations for this kind of error, mapping the `footprint.keys`
        // (~=column names) back to attribute names, and attaching a `toJSON()` function.

        // Format the `attrNames` property of our error by parsing `footprint.keys`.
        // Along the way, also track any unmatched keys.
        var namesOfOffendingAttrs = [];
        var unmatchedKeys = [];
        _.each(err.footprint.keys, function(key){

          // Find matching attr name.
          var matchingAttrName;
          _.any(WLModel.schema, function(wlsAttr, attrName) {

            var attrDef = WLModel.attributes[attrName];
            assert(attrDef, 'Attribute (`'+attrName+'`) is corrupted!  This attribute exists as a WLS attr in `schema`, so it should always exist in `attributes` as well-- but it does not!  If you are seeing this message, it probably means your model (`'+modelIdentity+'`) has become corrupted.');

            // If this is a plural association, then skip it.
            // (it is impossible for a key from this error to match up with one of these-- they don't even have column names)
            if (attrDef.collection) { return; }

            // Otherwise, we can expect a valid column name to exist.
            assert(wlsAttr.columnName, 'The normalized `schema` of model `'+modelIdentity+'` has an attribute (`'+attrName+'`) with no `columnName`.  But at this point, every WLS-normalized attribute should have a column name!  (If you are seeing this error, the model definition may have been corrupted in-memory-- or there might be a bug in WL schema.)');

            if (wlsAttr.columnName === key) {
              matchingAttrName = attrName;
              return true;
            }
          });//</_.any>

          // Push it on, if it could be found.
          if (matchingAttrName) {
            namesOfOffendingAttrs.push(matchingAttrName);
          }
          // Otherwise track this as an unmatched key.
          else {
            unmatchedKeys.push(key);
          }

        });//</_.each()>


        // If there were any unmatched keys, log a warning and silently ignore them.
        if (unmatchedKeys.length > 0) {
          console.warn('\n'+
            'Warning: Adapter sent back a uniqueness error, but that error references key(s) ('+unmatchedKeys+') which cannot\n'+
            'be matched up with the column names of any attributes in this model (`'+modelIdentity+'`).  This probably\n'+
            'means there is a bug in this adapter.\n'+
            '(Note for adapter implementors: If your adapter doesn\'t support granular reporting of the keys violated\n'+
            'in uniqueness errors, then just use an empty array for the `keys` property of this error.)\n'+
            '(Proceeding anyway as if these keys weren\'t included...)\n'
          );
        }//>-


        // Build the customizations for our uniqueness error.
        return {

          message: 'Would violate uniqueness constraint-- a record already exists with conflicting value(s).',

          code: 'E_UNIQUE',

          attrNames: namesOfOffendingAttrs,

          toJSON: function (){
            return {
              code: this.code,
              message: this.message,
              modelIdentity: this.modelIdentity,
              attrNames: this.attrNames,
            };
          }

        };

      })();

      //  ██╗   ██╗███╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███╗   ██╗██╗███████╗███████╗██████╗
      //  ██║   ██║████╗  ██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔════╝ ████╗  ██║██║╚══███╔╝██╔════╝██╔══██╗
      //  ██║   ██║██╔██╗ ██║██████╔╝█████╗  ██║     ██║   ██║██║  ███╗██╔██╗ ██║██║  ███╔╝ █████╗  ██║  ██║
      //  ██║   ██║██║╚██╗██║██╔══██╗██╔══╝  ██║     ██║   ██║██║   ██║██║╚██╗██║██║ ███╔╝  ██╔══╝  ██║  ██║
      //  ╚██████╔╝██║ ╚████║██║  ██║███████╗╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║██║███████╗███████╗██████╔╝
      //   ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝╚══════╝╚══════╝╚═════╝
      //
      //  ███████╗ ██████╗  ██████╗ ████████╗██████╗ ██████╗ ██╗███╗   ██╗████████╗
      //  ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝
      //  █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝██████╔╝██║██╔██╗ ██║   ██║
      //  ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║
      //  ██║     ╚██████╔╝╚██████╔╝   ██║   ██║     ██║  ██║██║██║ ╚████║   ██║
      //  ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝
      //
      // Handle unrecognized footprint identity as a special case.  (This should never happen.)
      default: return {

        message:
        'Malformed error from adapter: If Error has a `footprint`, it should be a dictionary with a recognized `identity`.  '+
        'But this error\'s footprint identity (`'+err.footprint.identity+'`) is not recognized.'

      };

    }//</switch>

  })();//</self-invoking function that builds `customizations`>

  assert(_.isObject(customizations) && !_.isError(customizations), 'Consistency violations: At this point, `customizations` should be a dictionary, but it should not be an Error instance!');


  //  ██████╗ ██╗   ██╗██╗██╗     ██████╗        ██╗
  //  ██╔══██╗██║   ██║██║██║     ██╔══██╗       ██║
  //  ██████╔╝██║   ██║██║██║     ██║  ██║    ████████╗
  //  ██╔══██╗██║   ██║██║██║     ██║  ██║    ██╔═██╔═╝
  //  ██████╔╝╚██████╔╝██║███████╗██████╔╝    ██████║
  //  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝     ╚═════╝
  //
  //  ██████╗ ███████╗████████╗██╗   ██╗██████╗ ███╗   ██╗    ███████╗██╗███╗   ██╗ █████╗ ██╗
  //  ██╔══██╗██╔════╝╚══██╔══╝██║   ██║██╔══██╗████╗  ██║    ██╔════╝██║████╗  ██║██╔══██╗██║
  //  ██████╔╝█████╗     ██║   ██║   ██║██████╔╝██╔██╗ ██║    █████╗  ██║██╔██╗ ██║███████║██║
  //  ██╔══██╗██╔══╝     ██║   ██║   ██║██╔══██╗██║╚██╗██║    ██╔══╝  ██║██║╚██╗██║██╔══██║██║
  //  ██║  ██║███████╗   ██║   ╚██████╔╝██║  ██║██║ ╚████║    ██║     ██║██║ ╚████║██║  ██║███████╗
  //  ╚═╝  ╚═╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
  //
  //  ███████╗██████╗ ██████╗  ██████╗ ██████╗
  //  ██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
  //  █████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
  //  ██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
  //  ███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
  //  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
  //
  // Tack on the baseline customizations that are used in every adapter error.
  _.extend(customizations, {
    name: 'AdapterError',
    modelIdentity: modelIdentity,
    raw: err,
  });

  // Then build and return the final error.
  //
  // > Remember: This cannibalizes the `omen` that was passed in!
  return flaverr(customizations, omen);

};
