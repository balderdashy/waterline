/**
 * Module dependencies
 */

var flaverr = require('flaverr');

/**
 * verifyModelMethodContext()
 *
 * Take a look at the provided reference (presumably the `this` context of a
 * model method when it runs) and give it a sniff to make sure it's _probably_
 * a Sails/Waterline model.
 *
 * If it's definitely NOT a Sails/Waterline model, then throw a usage error
 * that explains that the model method seems to have been run from an invalid
 * context, and throw out some ideas about what you might do about that.
 *
 * > This utility is designed exclusively for use by the model methods defined
 * > within Waterline core.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} context
 *         The context (`this`) that this Waterline model method was invoked with.
 *
 * @throws {Error} If the context is not a model.
 *         @property {String} name :: 'UsageError'
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function verifyModelMethodContext(context) {

  if (!context.waterline) {
    throw flaverr({ name: 'UsageError' }, new Error(
      'Model method called from an unexpected context.  Expected `this` to refer to a Sails/Waterline '+
      'model, but it doesn\'t seem to.  (This sometimes occurs when passing a model method directly '+
      'through as the argument for something like `async.eachSeries()` or `.stream().eachRecord()`.  '+
      'If that\'s what happened here, then just use a wrapper function.)  For further help, see '+
      'http://sailsjs.com/support.'
    ));
  }

};

