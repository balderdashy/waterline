/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizeValueToSet = require('../utils/query/private/normalize-value-to-set');


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
 * try {
 *   var normalizedBalance = BankAccount.validate('balance', '$349.86');
 * } catch (e) {
 *   switch (e.code) {
 *     case 'E_VALIDATION':
 *       console.log(e);
 *       // => '[Error: Invalid `bankAccount`]'
 *       _.each(e.all, function(woe){
 *         console.log(woe.attrName+': '+woe.message);
 *       });
 *       break;
 *     default: throw e;
 *   }
 * }
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
 * @throws {Error} If it encountered incompatible usage in the provided `value`,
 *   |     including e.g. the case where an invalid value was specified for
 *   |     an association.
 *   |     @property {String} name  => "UsageError"
 *   |     @property {String} code  => "E_HIGHLY_IRREGULAR"
 *
 * @throws {Error} If validation failed completely (i.e. value not close enough to coerce automatically)
 *   |             > Note that a "validation failure" could constitute failure of a type safety check,
 *   |             > the requiredness guarantee, or violation of the attribute's validation ruleset.
 *   |     @property {String} name  => "UsageError"
 *   |     @property {String} code  => "E_VALIDATION"
 *   |     @property {Function} toJSON
 *   |         @returns {Dictionary} `{code: 'E_VALIDATION', message:'...', errors:[...]`)
 *   |     @property {Array} errors
 *   |         [
 *   |           {
 *   |             problem: 'rule',
 *   |             attribute: 'foo',
 *   |             message: 'Value was not in the configured whitelist (paid,delinquent,pending,n/a).',
 *   |             rule: 'isIn',
 *   |           },
 *   |           {
 *   |             problem: 'rule',
 *   |             attribute: 'foo',
 *   |             message: 'Value failed custom validation.',
 *   |             rule: 'custom',
 *   |           },
 *   |           {
 *   |             problem: 'rule',
 *   |             attribute: 'bar',
 *   |             message: 'Value was longer than the configured maximum length (255).',
 *   |             rule: 'maxLength',
 *   |           },
 *   |           {
 *   |             problem: 'type',
 *   |             attribute: 'baz',
 *   |             message: 'Value did not match the expected type (number).',
 *   |             expected: 'number',
 *   |           },
 *   |           {
 *   |             problem: 'required',
 *   |             attribute: 'beep',
 *   |             message: 'No value was specified.',
 *   |           },
 *   |           {
 *   |             problem: 'required',
 *   |             attribute: 'boop',
 *   |             message: 'Invalid value for a required attribute.',
 *   |           },
 *   |           ...
 *   |         ]
 *
 * @throws {Error} If anything else unexpected occurs.
 */

module.exports = function validate(attrName, value) {

  var orm = this.waterline;
  var modelIdentity = this.identity;

  if (!_.isString(attrName)) {
    throw flaverr({ name: 'UsageError' }, new Error(
      'Please specify the name of the attribute to validate against (1st argument).'
    ));
  }//-•

  var normalizedVal;
  try {
    normalizedVal = normalizeValueToSet(value, attrName, modelIdentity, orm, false);
  } catch (e) {
    switch (e.code) {

      // If it is determined that this should be ignored, it's either because
      // the attr is outside of the schema or the value is undefined.  In this
      // case, set it to `undefined` and then continue on ahead to the checks
      // below.
      case 'E_SHOULD_BE_IGNORED':
        normalizedVal = undefined;
        break;

      // Failed requireness guarantee
      case 'E_REQUIRED':
        throw e;

      // Violated the attribute's validation ruleset
      case 'E_VIOLATES_RULESET':
        throw e;

      // Failed type safety check
      case 'E_TYPE':
        // vdnErrors = e;[supposedAttrName] = e;
        // 'New record contains the wrong type of data for property `'+supposedAttrName+'`.  '+e.message
        throw flaverr({
          code: 'E_VALIDATION',
          errors: [
            {
              problem: 'type',
              attribute: attrName,
              message: e.message,
              expectedType: e.expected
            }
          ]
        }, new Error('Invalid value.'));

      // Miscellaneous usage error
      case 'E_HIGHLY_IRREGULAR':
        throw e;

      // Unexpected error
      default:
        throw e;
    }
  }//>-•

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: change this logic so that it works like it does for `.create()`
  // (instead of just working like it does for .update())
  //
  // That entails applying required and defaultsTo down here at the bottom,
  // and figuring out what makes sense to do for the auto timestamps.  Note
  // that we'll also need to change the `false` flag above to `true` (the one
  // we pass in to normalizeValueToSet)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Return normalized value.
  return normalizedVal;

};
