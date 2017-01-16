/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var cloneAndExtendMyConstructor = require('./utils/system/extend');
var LifecycleCallbackBuilder = require('./utils/system/lifecycle-callback-builder');
var TransformerBuilder = require('./utils/system/transformer-builder');
var hasSchemaCheck = require('./utils/system/has-schema-check');


/**
 * WLModel
 *
 * Construct a WLModel instance (e.g. `User`) with methods for interacting
 * with a set of structured database records.
 *
 * > This file contains the entry point for all ORM methods (e.g. User.find())
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Usage:
 * ```
 * var someWLModel = new WLModel(orm, { adapter: require('sails-disk') });
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary} orm
 *
 * @param {Dictionary} adapterWrapper
 *        @property {Dictionary} adapter
 *                  The adapter definition.
 *                  ************************************************************
 *                  TODO: probly just remove this second argument.  Instead of
 *                  passing it in, it seems like we should just look up the
 *                  appropriate adapter at the top of this constructor function
 *                  (or even just attach `._adapter` in userland- after instantiating
 *                  the WLModel instance).  (The only code instantiating WLModel
 *                  instances is inside of Waterline core anyway.)
 *                  ************************************************************
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @constructs {WLModel}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

var WLModel = module.exports = function WLModel (orm, adapterWrapper) {

  // Attach a private reference to the adapter definition indicated by
  // this model's configured `datastore`.
  this._adapter = adapterWrapper.adapter;

  // Attach a private reference to the ORM.
  this._orm = orm;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // > Note that we also alias it as `this.waterline`.
  this.waterline = orm;
  // ^^^
  // FUTURE: remove this alias in Waterline v1.0
  // (b/c it implies that `this.waterline` might be the stateless export from
  // the Waterline package itself, rather than what it actually is: a configured
  // ORM instance)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Initialize the `attributes` of our WLModel to an empty dictionary, unless they're
  // already set.
  if (_.isUndefined(this.attributes)) {
    this.attributes = {};
  }
  else {
    if (!_.isObject(this.attributes)) {
      throw new Error('Consistency violation: When instantiating this WLModel, it became clear (within the constructor) that `this.attributes` was already set, and not a dictionary: '+util.inspect(this.attributes, {depth: 5})+'');
    }
  }

  // Set the `adapter` property to an empty dictionary if it is not already truthy.
  this.adapter = this.adapter || {};
  // ^^TODO: can we remove this now?

  // Build a dictionary of all lifecycle callbacks applicable to this WLModel, and
  // attach it as a private property (`_callbacks`).
  this._callbacks = LifecycleCallbackBuilder(this);
  //^^FUTURE: bust this utility apart to make it stateless like the others
  //
  //^^FUTURE: Also, document what's going on here as far as timing-- i.e. answering questions
  //like "when are model settings from the original model definition applied?" and
  //"How are they set?".

  // Set the `hasSchema` flag for this model.
  // > This is based on a handful of factors, including the original model definition,
  // > ORM-wide default model settings, and (if defined) an implicit default from the
  // > adapter itself.
  this.hasSchema = hasSchemaCheck(this);
  // ^^FUTURE: change utility's name to either the imperative mood (e.g. `getSchemafulness()`)
  // or interrogative mood (`isSchemaful()`) for consistency w/ the other utilities
  // (and to avoid confusion, because the name of the flag makes it kind of crazy in this case.)

  // Build a TransformerBuilder instance and attach it as a private property (`_transformer`).
  this._transformer = new TransformerBuilder(this.schema);
  // ^^FUTURE: bust this utility apart to make it stateless like the others

  return this;
  // ^^FUTURE: remove this `return` (it shouldn't be necessary)
};


// Now extend the WLModel constructor's `prototype` with each built-in model method.
// > This allows for the use of `Foo.find()`, etc.
_.extend(
  WLModel.prototype,
  {
    // DQL
    find: require('./methods/find'),
    findOne: require('./methods/find-one'),
    findOrCreate: require('./methods/find-or-create'),
    stream: require('./methods/stream'),
    count: require('./methods/count'),
    sum: require('./methods/sum'),
    avg: require('./methods/avg'),

    // DML
    create: require('./methods/create'),
    createEach: require('./methods/create-each'),
    update: require('./methods/update'),
    destroy: require('./methods/destroy'),
    addToCollection: require('./methods/add-to-collection'),
    removeFromCollection: require('./methods/remove-from-collection'),
    replaceCollection: require('./methods/replace-collection'),

    // Misc.
    validate: require('./methods/validate'),
  }
);


// Attach a static `extend()` method to the WLModel constructor.
WLModel.extend = cloneAndExtendMyConstructor;
