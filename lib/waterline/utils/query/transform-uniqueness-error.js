/**
 * Module dependencies
 */

 var util = require('util');
 var _ = require('@sailshq/lodash');
 var getModel = require('../ontology/get-model');


/**
 * transformUniquenessError()
 *
 * Given a raw uniqueness error from the adapter, examine its `footprint` property in order
 * to build a new, normalized Error instance.  The new Error has an `attrNames` array, as well
 * as a `.toJSON()` method, and `code: 'E_UNIQUE'`.
 *
 * > For more info on the lower-level driver specification, from whence this error originates, see:
 * > https://github.com/treelinehq/waterline-query-docs/blob/a0689b6a6536a3c196dff6a9528f2ef72d4f6b7d/docs/errors.md#notunique
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Ref} rawUniquenessError
 * @param {Function} stackFrameFloorFn   [used purely for improving the quality of the stack trace]
 * @param {String} modelIdentity
 * @param {Ref} orm
 *
 * @returns {Error} the new error
 *                      @property {String} code [E_UNIQUE]
 *                      @property {String} modelIdentity
 *                      @property {Array} attrNames
 *                                @of {String}
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function transformUniquenessError (rawUniquenessError, stackFrameFloorFn, modelIdentity, orm){

  // Sanity checks
  if (!_.isObject(rawUniquenessError.footprint) || !_.isString(rawUniquenessError.footprint.identity)) {
    throw new Error('Consistency violation: Should never call this utility unless the provided error is a uniqueness error.  But the provided error has a missing or invalid `footprint`: '+util.inspect(rawUniquenessError.footprint, {depth:5})+'');
  }
  if (rawUniquenessError.footprint.identity !== 'notUnique') {
    throw new Error('Consistency violation: Should never call this utility unless the provided error is a uniqueness error.  But the footprint of the provided error has an unexpected `identity`: '+util.inspect(rawUniquenessError.footprint.identity, {depth:5})+'');
  }

  // Verify that all the stuff is there
  if (!_.isArray(rawUniquenessError.keys)) {
    throw new Error('Malformed uniqueness error sent back from adapter: Footprint should have an array of `keys`!  But instead, `footprint.keys` is: '+util.inspect(rawUniquenessError.footprint.keys, {depth:5})+'');
  }


  var WLModel = getModel(modelIdentity, orm);

  var newUniquenessError = flaverr({

    code: 'E_UNIQUE',

    modelIdentity: modelIdentity,

    attrNames: _.reduce(rawUniquenessError.footprint.keys, function(memo, key){

      // Find matching attr name.
      var matchingAttrName;
      _.any(WLModel.schema, function(wlsAttr, attrName) {
        if (!wlsAttr.columnName) {
          console.warn(
            'Warning: Malformed ontology: The normalized `schema` of model `'+modelIdentity+'` has an '+
            'attribute (`'+attrName+'`) with no `columnName`.  But at this point, every WLS-normalized '+
            'attribute should have a column name!\n'+
            '(If you are seeing this error, the model definition may have been corrupted in-memory-- '+
            'or there might be a bug in WL schema.)'
          );
        }

        if (wlsAttr.columnName === key) {
          matchingAttrName = attrName;
          return true;
        }
      });

      // Push it on, if it could be found.
      if (matchingAttrName) {
        memo.push(matchingAttrName);
      }
      // Otherwise log a warning and silently ignore this item.
      else {
        console.warn(
          'Warning: Adapter sent back a uniqueness error, but one of the unique constraints supposedly '+
          'violated references a key (`'+key+'`) which cannot be matched up with any attribute.  This probably '+
          'means there is a bug in this model\'s adapter, or even in the underlying driver.  (Note for adapter '+
          'implementors: If your adapter doesn\'t support granular reporting of the keys violated in uniqueness '+
          'errors, then just use an empty array for the `keys` property of this error.)'
        );
      }

      return memo;

    }, []),//</_.reduce()>

    toJSON: function (){
      return {
        code: this.code,
        message: this.message,
        modelIdentity: this.modelIdentity,
        attrNames: this.attrNames,
      };
    }

  }, new Error(
    'Would violate uniqueness constraint-- a record already exists with conflicting value(s).'
  ));

  // Adjust stack trace.
  Error.captureStackTrace(newUniquenessError, stackFrameFloorFn);

  // Return the new uniqueness error.
  return newUniquenessError;

};
