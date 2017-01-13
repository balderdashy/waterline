/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizePkValue = require('./normalize-pk-value');


/**
 * normalizePkValueOrValues()
 *
 * Validate and normalize an array of pk values, OR a single pk value, into a consistent format.
 *
 * > Internally, this uses the `normalizePkValue()` utility to check/normalize each
 * > primary key value before returning them.  If an array is provided, and if it contains
 * > _more than one pk value that is exactly the same_, then the duplicates will be stripped
 * > out.
 *
 * ------------------------------------------------------------------------------------------
 * @param  {Array|String|Number} pkValueOrPkValues
 * @param  {String} expectedPkType   [either "number" or "string"]
 * ------------------------------------------------------------------------------------------
 * @returns {Array}
 *          A valid, homogeneous array of primary key values that are guaranteed
 *          to match the specified `expectedPkType`.
 *          > WE should NEVER rely on this array coming back in a particular order.
 *          > (Could change at any time.)
 * ------------------------------------------------------------------------------------------
 * @throws {Error} if invalid
 *         @property {String} code (=== "E_INVALID_PK_VALUE")
 */

module.exports = function normalizePkValueOrValues (pkValueOrPkValues, expectedPkType){

  // Check usage
  if (expectedPkType !== 'string' && expectedPkType !== 'number') {
    throw new Error('Consistency violation: The internal normalizePkValueOrValues() utility must always be called with a valid second argument ("string" or "number").  But instead, got: '+util.inspect(expectedPkType, {depth:5})+'');
  }


  // Our normalized result.
  var pkValues;

  // If a singular string or number was provided, convert it into an array.
  if (_.isString(pkValueOrPkValues) || _.isNumber(pkValueOrPkValues)) {
    pkValues = [ pkValueOrPkValues ];
  }
  // Otherwise, we'll assume it must already be an array.
  // (Don't worry, we'll validate it momentarily.)
  else {
    pkValues = pkValueOrPkValues;
  }
  //>-


  // Now, handle the case where something completely invalid was provided.
  if (!_.isArray(pkValues)) {
    throw flaverr('E_INVALID_PK_VALUE', new Error('Expecting either an individual primary key value (a '+expectedPkType+') or a homogeneous array of primary key values ('+expectedPkType+'s).  But instead got a '+(typeof pkValues)+': '+util.inspect(pkValues,{depth:5})+''));
  }//-•


  // Now that we most definitely have an array, ensure that it doesn't contain anything
  // strange, curious, or malevolent by looping through and calling `normalizePkValue()`
  // on each item.
  pkValues = _.map(pkValues, function (thisPkValue){

    // Return this primary key value, which might have been coerced.
    try {
      return normalizePkValue(thisPkValue, expectedPkType);
    } catch (e) {
      switch (e.code) {
        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_INVALID_PK_VALUE', new Error(
            (
              _.isArray(pkValueOrPkValues) ?
              'One of the values in the provided array' :
              'The provided value'
            )+' is not valid primary key value.  '+e.message
          ));
        default: throw e;
      }
    }

  });//</_.map()>


  // Ensure uniqueness.
  // (Strip out any duplicate pk values.)
  pkValues = _.uniq(pkValues);


  // Return the normalized array of pk values.
  return pkValues;

};

