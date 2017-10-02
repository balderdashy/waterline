/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizeValueToSet = require('../utils/query/private/normalize-value-to-set');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * validate()
 *
 * Verify that a value would be valid for a given attribute, then return it, loosely coerced.
 *
 * > Note that this validates the value in the same way it would be checked
 * > if it was passed in to an `.update()` query-- NOT a `.create()`!!
 *
 * ```
 * // Check the given string and return a normalized version.
 * var normalizedBalance = BankAccount.validate('balance', '349.86');
 * //=> 349.86
 *
 * // Note that if normalization is not possible, this throws:
 * var normalizedBalance;
 * try {
 *   normalizedBalance = BankAccount.validate('balance', '$349.86');
 * } catch (e) {
 *   switch (e.code) {
 *     case 'E_':
 *       console.log(e);
 *       // => '[Error: Invalid `bankAccount`]'
 *       throw e;
 *     default: throw e;
 *   }
 * }
 *
 * // IWMIH, then it was valid...although it may have been normalized a bit (potentially in-place).
 *
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {String} attrName
 *        The name of the attribute to validate against.
 *
 * @param {Ref} value
 *        The value to validate/normalize.
 *
 * --
 *
 * @returns {Ref}
 *          The successfully-normalized value.  (MAY or MAY NOT be the same as the original reference.)
 *
 * --
 *
 * @throws {Error} If it encounters incompatible usage in the provided `value`,
 *                 including e.g. the case where an invalid value is specified for
 *                 an association.
 *         @property {String} code
 *                   - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the provided `value` has an incompatible data type.
 *   |     @property {String} code
 *   |               - E_TYPE
 *   |     @property {String} expectedType
 *   |               - string
 *   |               - number
 *   |               - boolean
 *   |               - json
 *   |
 *   | This is only versus the attribute's declared "type", or other similar type safety issues  --
 *   | certain failed checks for associations result in a different error code (see above).
 *   |
 *   | Remember:
 *   | This is the case where a _completely incorrect type of data_ was passed in.
 *   | This is NOT a high-level "anchor" validation failure! (see below for that)
 *   | > Unlike anchor validation errors, this exception should never be negotiated/parsed/used
 *   | > for delivering error messages to end users of an application-- it is carved out
 *   | > separately purely to make things easier to follow for the developer.
 *
 *
 * @throws {Error} If the provided `value` fails the requiredness guarantee of the corresponding attribute.
 *   |     @property {String} code
 *   |               - E_REQUIRED
 *
 *
 * @throws {Error} If the provided `value` violates one or more of the high-level validation rules
 *   |             configured for the corresponding attribute.
 *   |     @property {String} code
 *   |               - E_VIOLATES_RULES
 *   |     @property {Array} ruleViolations
 *   |               e.g.
 *   |               ```
 *   |               [
 *   |                 {
 *   |                   rule: 'minLength',    //(isEmail/isNotEmptyString/max/isNumber/etc)
 *   |                   message: 'Too few characters (max 30)'
 *   |                 }
 *   |               ]
 *   |               ```
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 *
 */

module.exports = function validate(attrName, value) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var orm = this.waterline;
  var modelIdentity = this.identity;

  if (!_.isString(attrName)) {
    throw flaverr({ name: 'UsageError' }, new Error(
      'Please specify the name of the attribute to validate against (1st argument).'
    ));
  }//-•

  var normalizedVal;
  try {
    normalizedVal = normalizeValueToSet(value, attrName, modelIdentity, orm);
  } catch (e) {
    switch (e.code) {

      // If it is determined that this should be ignored, it's either because
      // the attr is outside of the schema or the value is undefined.  In this
      // case, set it to `undefined` and then continue on ahead to the checks
      // below.
      case 'E_SHOULD_BE_IGNORED':
        normalizedVal = undefined;
        break;

      // Violated the attribute's validation ruleset
      case 'E_VIOLATES_RULES':
        throw e;

      // Failed requireness guarantee
      case 'E_REQUIRED':
        throw e;

      // Failed type safety check
      case 'E_TYPE':
        throw e;

      // Miscellaneous incompatibility
      case 'E_HIGHLY_IRREGULAR':
        throw e;

      // Unexpected error
      default:
        throw e;
    }
  }//>-•

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: expand this logic so that it can work like it does for `.create()`
  // (in addition or instead of just working like it does for .update())
  //
  // That entails applying required and defaultsTo down here at the bottom,
  // and figuring out what makes sense to do for the auto timestamps.  Note
  // that we'll also need to change the `false` flag above to `true` (the one
  // we pass in to normalizeValueToSet)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Return normalized value.
  return normalizedVal;

};
