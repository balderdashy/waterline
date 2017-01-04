/**
 * Module dependencies
 */

 var util = require('util');
 var _ = require('@sailshq/lodash');
 var getModel = require('../ontology/get-model');


/**
 * transformUniquenessError()
 *
 * Given a uniqueness error from the adapter (E_UNIQUE), examine its `keys` property
 * in order to build & attach an `attrNames` array.
 *
 * > If the adapter is using a Waterline driver, then the error's `keys` property
 * > should come directly from the footprint.  Similarly, the error should have been
 * > identified and its code set to E_UNIQUE based on `error.footprint.identity === 'notUnique'`.
 * >
 * > For more information, see:
 * > https://github.com/treelinehq/waterline-query-docs/blob/a0689b6a6536a3c196dff6a9528f2ef72d4f6b7d/docs/errors.md#notunique
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Ref} uniquenessError   [Mutated in-place!]
 * @param {String} modelIdentity
 * @param {Ref} orm
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function transformUniquenessError (uniquenessError, modelIdentity, orm){

  // Sanity check
  if (uniquenessError.code !== 'E_UNIQUE') {
    throw new Error('Consistency violation: Should never call this utility unless the provided error is a uniqueness error.  But the provided error has an unexpected `code`: '+util.inspect(uniquenessError.code, {depth:5})+'');
  }

  // Verify that adapter error is well-formed:
  if (!_.isUndefined(uniquenessError.footprint)) {
    if (!_.isObject(uniquenessError.footprint) || !_.isString(uniquenessError.footprint.identity)) {
      throw new Error('Malformed E_UNIQUE error sent back from adapter: If specified, the `footprint` property should be the original footprint (dictionary) from the underlying driver, which should always have an `identity` property.  But instead, it is: '+util.inspect(uniquenessError.footprint, {depth:5})+'');
    }
  }

  if (!_.isArray(uniquenessError.keys)) {
    throw new Error('Malformed E_UNIQUE error sent back from adapter: Should have an array of `keys`!  But instead, `.keys` is: '+util.inspect(uniquenessError.keys, {depth:5})+'');
  }


  var WLModel = getModel(modelIdentity, orm);

  uniquenessError.attrNames = _.reduce(uniquenessError.footprint.keys, function(memo, key){

    // Find matching attr name.
    var matchingAttrName;
    _.any(WLModel.schema, function(wlsAttrDef, attrName) {
      if (!wlsAttrDef.columnName) {
        console.warn(
          'Warning: Malformed ontology: The normalized `schema` of model `'+modelIdentity+'` has an '+
          'attribute (`'+attrName+'`) with no `columnName`.  But at this point, every WLS-normalized '+
          'attribute should have a column name!\n'+
          '(If you are seeing this error, the model definition may have been corrupted in-memory-- '+
          'or there might be a bug in WL schema.)'
        );
      }

      if (wlsAttrDef.columnName === key) {
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
  }, []);

  // No need to return anything -- the error is mutated in-place.

};
