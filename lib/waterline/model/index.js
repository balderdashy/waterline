
/**
 * Module dependencies
 */

var _ = require('lodash');
var Bluebird = require('bluebird');
var Model = require('./lib/model');
var defaultMethods = require('./lib/defaultMethods');
var internalMethods = require('./lib/internalMethods');
var Association = require('./lib/association');

/**
 * Build Extended Model Prototype
 *
 * @param {Object} context
 * @param {Object} mixins
 * @return {Object}
 * @api public
 */

module.exports = function(context, mixins) {

  /**
   * Extend the model prototype with default instance methods
   */

  //var protoInstance = {};

  var associationDefiner = new internalMethods.defineAssociations(context, {});
  var origAssociations = associationDefiner.proto.associations;
  var belongsToAssociations = [];
  var hasManyAssociations = [];
  var jsonAttrNames = [];
  var boolAttrNames = [];
  var belongsToCheckMap = {};

  Object.keys(origAssociations).forEach(function (associationName) {
    if (origAssociations[associationName] instanceof Association) {
      hasManyAssociations.push(associationName);
    } else {
      belongsToAssociations.push(associationName);
      belongsToCheckMap[associationName] = true;
    }
  });

  Object.keys(context._attributes).forEach(function(key) {
    var type = context._attributes[key].type;

    if(type === 'array' || type === 'json') {
      jsonAttrNames.push(key);
    } else if(type === 'boolean') {
      boolAttrNames.push(key)
    }
  });

  var prototypeFns = {

    toObject: function() {
      return new defaultMethods.toObject(context, this);
    },

    save: function(cb) {
      return new defaultMethods.save(context, this, cb);
    },

    destroy: function(cb) {
      return new defaultMethods.destroy(context, this, cb);
    },

    _defineAssociations: function() {
      associationDefiner.proto = this;
      belongsToAssociations.forEach(function (associationName) {
        associationDefiner.buildBelongsToProperty({
          key: associationName,
          val: origAssociations[associationName]
        });
      });

      hasManyAssociations.forEach(function (associationName) {
        associationDefiner.buildHasManyProperty(associationName);
      });
    },

    _cast: function(values) {
      jsonAttrNames.forEach(function (key) {
        if(!_.isString(values[key])) return;
        try {
          values[key] = JSON.parse(values[key]);
        } catch(e) {
          return;
        }
      });

      boolAttrNames.forEach(function (key) {
        var val = values[key];
        if(val === 0) values[key] = false;
        if(val === 1) values[key] = true;
      });
    },

    _isBelongsToAttr: function (attrName) {
      return  belongsToCheckMap[attrName];
    },

    /**
     * Model.validate()
     *
     * Takes the currently set attributes and validates the model
     * Shorthand for Model.validate({ attributes }, cb)
     *
     * @param {Function} callback - (err)
     * @return {Promise}
     */

    validate: function(cb) {
      // Collect current values
      var values = this.toObject();

      if(cb) {
        context.validate(values, function(err) {
          if(err) return cb(err);
          cb();
        });
        return;
      }

      else {
        return new Bluebird(function (resolve, reject) {
          context.validate(values, function(err) {
            if(err) return reject(err);
            resolve();
          });
        });
      }
    }

  };

  // If any of the attributes are protected, the default toJSON method should
  // remove them.
  var protectedAttributes = _.compact(_.map(context._attributes, function(attr, key) {return attr.protected ? key : undefined;}));

  prototypeFns.toJSON = function() {
    var obj = this.toObject();

    if (protectedAttributes.length) {
      _.each(protectedAttributes, function(key) {
        delete obj[key];
      });
    }

    // Remove toJSON from the result, to prevent infinite recursion with
    // msgpack or other recursive object transformation tools.
    //
    // Causes issues if set to null and will error in Sails if we delete it because blueprints call it.
    //
    // obj.toJSON = null;

    return obj;
  };

  var prototype = _.extend(prototypeFns, mixins);

  var model = Model.extend(prototype);

  Object.defineProperty(model.prototype, 'associations', {
    get: function () {
      return this._internal.associations;
    },
    set: function (val) {
      this._internal.associations = val;
    }
  });


  Object.defineProperty(model.prototype, '_properties', {
    get: function () {
      return this._internal && this._internal.properties;
    },
    set: function () {}
  });

  Object.defineProperty(model.prototype, 'inspect', {
    get: function () {
      return this._internal && this._internal.inspect
    },
    set: function () {}
  });


  // Return the extended model for use in Waterline
  return model;
};
