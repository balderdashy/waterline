/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
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
 *                  FUTURE: probably just remove this second argument.  Instead of
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



//  ██╗███╗   ██╗███████╗████████╗ █████╗ ███╗   ██╗ ██████╗███████╗
//  ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗████╗  ██║██╔════╝██╔════╝
//  ██║██╔██╗ ██║███████╗   ██║   ███████║██╔██╗ ██║██║     █████╗
//  ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║╚██╗██║██║     ██╔══╝
//  ██║██║ ╚████║███████║   ██║   ██║  ██║██║ ╚████║╚██████╗███████╗
//  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
//
//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//
// INSTANCE METHODS
//
// Now extend the WLModel constructor's `prototype` with each built-in model method.
// > This allows for the use of `Foo.find()`, etc., and it's equivalent to attaching
// > each method individually (e.g. `WLModel.prototype.find = ()->{}`), just with
// > slightly better performance characteristics.
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


//  ███████╗████████╗ █████╗ ████████╗██╗ ██████╗
//  ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║██╔════╝
//  ███████╗   ██║   ███████║   ██║   ██║██║
//  ╚════██║   ██║   ██╔══██║   ██║   ██║██║
//  ███████║   ██║   ██║  ██║   ██║   ██║╚██████╗
//  ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝
//
//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//
// STATIC METHODS
//
// Now add properties to the WLModel constructor itself.

/**
 * WLModel.extend()
 *
 * Build & return a new constructor based on the existing constructor in the
 * current runtime context (`this`) -- which happens to be our base model
 * constructor (WLModel).  This also attaches the specified properties to
 * the new constructor's prototype.
 *
 *
 * > Originally taken from `.extend()` in Backbone source:
 * > http://backbonejs.org/docs/backbone.html#section-189
 * >
 * > Although this is called `extend()`, note that it does not actually modify
 * > the original WLModel constructor.  Instead, it first builds a shallow
 * > clone of the original constructor and then extends THAT.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary?}  protoProps
 *        Optional extra set of properties to attach to the new ctor's prototype.
 *        (& possibly a brand of breakfast cereal)
 *
 * @param {Dictionary?}  staticProps
 *        Optional extra set of properties to attach directly to the new ctor.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Function}  [The new constructor]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @this {Function}  [The original constructor -- WLModelConstructor]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
WLModel.extend = function (protoProps, staticProps) {
  var thisConstructor = this;

  var newConstructor;
  if (protoProps && _.has(protoProps, 'constructor')) {
    // TODO: remove support for this if possible-- we don't seem to be relying on it
    newConstructor = protoProps.constructor;
  } else {
    newConstructor = function() { return thisConstructor.apply(this, arguments); };
  }

  // Shallow-copy all of the static properties (top-level props of original constructor)
  // over to the new constructor.
  _.extend(newConstructor, thisConstructor, staticProps);
  // ^^TODO: remove support for attaching additional custom static properties if possible
  // (doesn't appear to be in use anywhere, and _shouldn't_ be in use anywhere)

  // Create an ad hoc "Surrogate" -- a short-lived, bionic kind of a constructor
  // that serves as an intermediary... or maybe more of an organ donor?  Surrogate
  // is probably still best.  Anyway it's some dark stuff, that's for sure.  Because
  // what happens next is that we give it a reference to our original ctor's prototype
  // and constructor, then "new up" an instance for us-- but only so that we can cut out
  // that newborn instance's `prototype` and put it where the prototype for our new ctor
  // is supposed to go.
  //
  // > Why?  Well for one thing, this is important so that our new constructor appears
  // > to "inherit" from our original constructor.  But more a likely more prescient motive
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

