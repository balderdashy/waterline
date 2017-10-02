/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var LifecycleCallbackBuilder = require('./utils/system/lifecycle-callback-builder');
var TransformerBuilder = require('./utils/system/transformer-builder');
var hasSchemaCheck = require('./utils/system/has-schema-check');


/**
 * MetaModel
 *
 * Construct a new MetaModel instance (e.g. `User` or `WLModel`) with methods for
 * interacting with a set of structured database records.
 *
 * > This is really just the same idea as constructing a "Model instance"-- we just
 * > use the term "MetaModel" for utmost clarity -- since at various points in the
 * > past, individual records were referred to as "model instances" rather than "records".
 * >
 * > In other words, this file contains the entry point for all ORM methods
 * > (e.g. User.find()).  So like, `User` is a MetaModel instance.  You might
 * > call it a "model" or a "model model" -- the important thing is just to
 * > understand that we're talking about the same thing in either case.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * Usage:
 * ```
 * var WLModel = new MetaModel(orm, { adapter: require('sails-disk') });
 * // (sorry about the capital "W" in the instance!)
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary} orm
 *
 * @param {Dictionary} adapterWrapper
 *        @property {Dictionary} adapter
 *                  The adapter definition.
 *                  ************************************************************
 *                  FUTURE: probably just remove this second argument.  Instead of
 *                  passing it in, it seems like we should just look up the
 *                  appropriate adapter at the top of this constructor function
 *                  (or even just attach `._adapter` in userland- after instantiating
 *                  the new MetaModel instance-- e.g. "WLModel").  The only code that
 *                  directly runs `new MetaModel()` or `new SomeCustomizedMetaModel()`
 *                  is inside of Waterline core anyway.)
 *                  ************************************************************
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @constructs {MetaModel}
 *             The base MetaModel from whence other MetaModels are customized.
 *             Remember: running `new MetaModel()` yields an instance like `User`,
 *             which is itself generically called a WLModel.
 *
 *             > This is kind of confusing, mainly because capitalization.  And
 *             > it feels silly to nitpick about something so confusing.  But at
 *             > least this way we know what everything's called, and it's consistent.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

var MetaModel = module.exports = function MetaModel (orm, adapterWrapper) {

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

  // Initialize the `attributes` of our new MetaModel instance (e.g. `User.attributes`)
  // to an empty dictionary, unless they're already set.
  if (_.isUndefined(this.attributes)) {
    this.attributes = {};
  }
  else {
    if (!_.isObject(this.attributes)) {
      throw new Error('Consistency violation: When instantiating this new instance of MetaModel, it became clear (within the constructor) that `this.attributes` was already set, and not a dictionary: '+util.inspect(this.attributes, {depth: 5})+'');
    }
    else {
      // FUTURE: Consider not allowing this, because it's weird.
    }
  }


  // Build a dictionary of all lifecycle callbacks applicable to this model, and
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



//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//
// MODEL METHODS
//
// Now extend the MetaModel constructor's `prototype` with each built-in model method.
// > This allows for the use of `Foo.find()`, etc., and it's equivalent to attaching
// > each method individually (e.g. `MetaModel.prototype.find = ()->{}`), just with
// > slightly better performance characteristics.
_.extend(
  MetaModel.prototype,
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
    archive: require('./methods/archive'),
    addToCollection: require('./methods/add-to-collection'),
    removeFromCollection: require('./methods/remove-from-collection'),
    replaceCollection: require('./methods/replace-collection'),

    // Misc.
    validate: require('./methods/validate'),
  }
);




// SPECIAL STATIC METAMODEL METHODS
//
// Now add properties to the MetaModel constructor itself.
// (i.e. static properties)

/**
 * MetaModel.extend()
 *
 * Build & return a new constructor based on the existing constructor in the
 * current runtime context (`this`) -- which happens to be our base model
 * constructor (MetaModel).  This also attaches the specified properties to
 * the new constructor's prototype.
 *
 *
 * > Originally taken from `.extend()` in Backbone source:
 * > http://backbonejs.org/docs/backbone.html#section-189
 * >
 * > Although this is called `extend()`, note that it does not actually modify
 * > the original MetaModel constructor.  Instead, it first builds a shallow
 * > clone of the original constructor and then extends THAT.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary?}  protoProps
 *        Optional extra set of properties to attach to the new ctor's prototype.
 *        (& possibly a brand of breakfast cereal)
 *
 * @param {Dictionary?}  staticProps
 *        NO LONGER SUPPORTED: An optional, extra set of properties to attach
 *        directly to the new ctor.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Function}  [The new constructor -- e.g. `SomeCustomizedMetaModel`]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @this {Function}  [The original constructor -- BaseMetaModel]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
MetaModel.extend = function (protoProps, staticProps) {
  var thisConstructor = this;

  // Sanity checks:

  // If a prototypal properties were provided, and one of them is under the `constructor` key,
  // then freak out.  This is no longer supported, and shouldn't still be in use anywhere.
  if (protoProps && _.has(protoProps, 'constructor')) {
    throw new Error('Consistency violation: The first argument (`protoProps`) provided to Waterline.Model.extend() should never have a `constructor` property. (This kind of usage is no longer supported.)');
  }

  // If any additional custom static properties were specified, then freak out.
  // This is no longer supported, and shouldn't still be in use anywhere.
  if (!_.isUndefined(staticProps)) {
    throw new Error('Consistency violation: Unrecognized extra argument provided to Waterline.Model.extend() (`staticProps` is no longer supported.)');
  }

  //--•
  // Now proceed with the classical, Backbone-flavor extending.

  var newConstructor = function() { return thisConstructor.apply(this, arguments); };

  // Shallow-copy all of the static properties (top-level props of original constructor)
  // over to the new constructor.
  _.extend(newConstructor, thisConstructor, staticProps);

  // Create an ad hoc "Surrogate" -- a short-lived, bionic kind of a constructor
  // that serves as an intermediary... or maybe more of an organ donor?  Surrogate
  // is probably still best.  Anyway it's some dark stuff, that's for sure.  Because
  // what happens next is that we give it a reference to our original ctor's prototype
  // and constructor, then "new up" an instance for us-- but only so that we can cut out
  // that newborn instance's `prototype` and put it where the prototype for our new ctor
  // is supposed to go.
  //
  // > Why?  Well for one thing, this is important so that our new constructor appears
  // > to "inherit" from our original constructor.  But likely a more prescient motive
  // > is so that our new ctor is a proper clone.  That is, it's no longer entangled with
  // > the original constructor.
  // > (More or less anyway.  If there are any deeply nested things, like an `attributes`
  // > dictionary -- those could still contain deep, entangled references to stuff from the
  // > original ctor's prototype.
  var Surrogate = function() { this.constructor = newConstructor; };
  Surrogate.prototype = thisConstructor.prototype;
  newConstructor.prototype = new Surrogate();

  // If extra `protoProps` were provided, merge them onto our new ctor's prototype.
  // (now that it's a legitimately separate thing that we can safely modify)
  if (protoProps) {
    _.extend(newConstructor.prototype, protoProps);
  }

  // Set a proprietary `__super__` key to keep track of the original ctor's prototype.
  // (see http://stackoverflow.com/questions/8596861/super-in-backbone#comment17856929_8614228)
  newConstructor.__super__ = thisConstructor.prototype;

  // Return our new ctor.
  return newConstructor;

};

