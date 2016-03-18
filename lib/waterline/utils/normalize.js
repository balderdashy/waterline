var _ = require('lodash');
var util = require('./helpers');
var hop = util.object.hasOwnProperty;
var switchback = require('switchback');
var errorify = require('../error');
var WLUsageError = require('../error/WLUsageError');

var normalize = module.exports = {

  // Expand Primary Key criteria into objects
  expandPK: function(context, options) {

    // Default to id as primary key
    var pk = 'id';

    // If autoPK is not used, attempt to find a primary key
    if (!context.autoPK) {
      // Check which attribute is used as primary key
      for (var key in context.attributes) {
        if (!util.object.hasOwnProperty(context.attributes[key], 'primaryKey')) continue;

        // Check if custom primaryKey value is falsy
        if (!context.attributes[key].primaryKey) continue;

        // If a custom primary key is defined, use it
        pk = key;
        break;
      }
    }

    // Check if options is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    if (_.isNumber(options) || _.isString(options) || Array.isArray(options)) {
      // Temporary store the given criteria
      var pkCriteria = _.clone(options);

      // Make the criteria object, with the primary key
      options = {};
      options[pk] = pkCriteria;
    }

    // If we're querying by primary key, create a coercion function for it
    // depending on the data type of the key
    if (options && options[pk]) {

      var coercePK;
      if(!context.attributes[pk]) {
        return pk;
      }
      
      if (context.attributes[pk].type == 'integer') {
        coercePK = function(pk) {return +pk;};
      } else if (context.attributes[pk].type == 'string') {
        coercePK = function(pk) {return String(pk).toString();};

      // If the data type is unspecified, return the key as-is
      } else {
        coercePK = function(pk) {return pk;};
      }

      // If the criteria is an array of PKs, coerce them all
      if (Array.isArray(options[pk])) {
        options[pk] = options[pk].map(coercePK);

      // Otherwise just coerce the one
      } else {
        if (!_.isObject(options[pk])) {
          options[pk] = coercePK(options[pk]);
        }
      }

    }

    return options;

  },

  // Normalize the different ways of specifying criteria into a uniform object
  criteria: function(origCriteria) {
    var criteria = _.cloneDeep(origCriteria);

    // If original criteria is already false, keep it that way.
    if (criteria === false) return criteria;

    if (!criteria) {
      return {
        where: null
      };
    }

    // Let the calling method normalize array criteria. It could be an IN query
    // where we need the PK of the collection or a .findOrCreateEach
    if (Array.isArray(criteria)) return criteria;

    // Empty undefined values from criteria object
    _.each(criteria, function(val, key) {
      if (_.isUndefined(val)) criteria[key] = null;
    });

    // Convert non-objects (ids) into a criteria
    // TODO: use customizable primary key attribute
    if (!_.isObject(criteria)) {
      criteria = {
        id: +criteria || criteria
      };
    }

    if (_.isObject(criteria) && !criteria.where && criteria.where !== null) {
      criteria = { where: criteria };
    }

    // Return string to indicate an error
    if (!_.isObject(criteria)) throw new WLUsageError('Invalid options/criteria :: ' + criteria);

    // If criteria doesn't seem to contain operational keys, assume all the keys are criteria
    if (!criteria.where && !criteria.joins && !criteria.join && !criteria.limit && !criteria.skip &&
      !criteria.sort && !criteria.sum && !criteria.average &&
      !criteria.groupBy && !criteria.min && !criteria.max && !criteria.select) {

      // Delete any residuals and then use the remaining keys as attributes in a criteria query
      delete criteria.where;
      delete criteria.joins;
      delete criteria.join;
      delete criteria.limit;
      delete criteria.skip;
      delete criteria.sort;
      criteria = {
        where: criteria
      };

    // If where is null, turn it into an object
    } else if (_.isNull(criteria.where)) criteria.where = {};


    // Move Limit, Skip, sort outside the where criteria
    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'limit')) {
      criteria.limit = parseInt(_.clone(criteria.where.limit), 10);
      if (criteria.limit < 0) criteria.limit = 0;
      delete criteria.where.limit;
    } else if (hop(criteria, 'limit')) {
      criteria.limit = parseInt(criteria.limit, 10);
      if (criteria.limit < 0) criteria.limit = 0;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'skip')) {
      criteria.skip = parseInt(_.clone(criteria.where.skip), 10);
      if (criteria.skip < 0) criteria.skip = 0;
      delete criteria.where.skip;
    } else if (hop(criteria, 'skip')) {
      criteria.skip = parseInt(criteria.skip, 10);
      if (criteria.skip < 0) criteria.skip = 0;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'sort')) {
      criteria.sort = _.clone(criteria.where.sort);
      delete criteria.where.sort;
    }

    // Pull out aggregation keys from where key
    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'sum')) {
      criteria.sum = _.clone(criteria.where.sum);
      delete criteria.where.sum;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'average')) {
      criteria.average = _.clone(criteria.where.average);
      delete criteria.where.average;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'groupBy')) {
      criteria.groupBy = _.clone(criteria.where.groupBy);
      delete criteria.where.groupBy;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'min')) {
      criteria.min = _.clone(criteria.where.min);
      delete criteria.where.min;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'max')) {
      criteria.max = _.clone(criteria.where.max);
      delete criteria.where.max;
    }

    if (hop(criteria, 'where') && criteria.where !== null && hop(criteria.where, 'select')) {
      criteria.select = _.clone(criteria.where.select);
      delete criteria.where.select;
    }

    // If WHERE is {}, always change it back to null
    if (criteria.where && _.keys(criteria.where).length === 0) {
      criteria.where = null;
    }

    // If an IN was specified in the top level query and is an empty array, we can return an
    // empty object without running the query because nothing will match anyway. Let's return
    // false from here so the query knows to exit out.
    if (criteria.where) {
      var falsy = false;
      Object.keys(criteria.where).forEach(function(key) {
        if (Array.isArray(criteria.where[key]) && criteria.where[key].length === 0) {
          falsy = true;
        }
      });

      if (falsy) return false;
    }

    // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
    // match it anyway and it can prevent errors in the adapters
    if (criteria.where && hop(criteria.where, 'or')) {

      // Ensure `or` is an array
      if (!_.isArray(criteria.where.or)) {
        throw new WLUsageError('An `or` clause in a query should be specified as an array of subcriteria');
      }

      var _clone = _.cloneDeep(criteria.where.or);
      criteria.where.or.forEach(function(clause, i) {
        Object.keys(clause).forEach(function(key) {
          if (Array.isArray(clause[key]) && clause[key].length === 0) {
            _clone.splice(i, 1);
          }
        });
      });

      criteria.where.or = _clone;
    }

    // Normalize sort criteria
    if (hop(criteria, 'sort') && criteria.sort !== null) {

      // Split string into attr and sortDirection parts (default to 'asc')
      if (_.isString(criteria.sort)) {
        var parts = criteria.sort.split(' ');

        // Set default sort to asc
        parts[1] = parts[1] ? parts[1].toLowerCase() : 'asc';

        // Expand criteria.sort into object
        criteria.sort = {};
        criteria.sort[parts[0]] = parts[1];
      }

      // normalize ASC/DESC notation
      Object.keys(criteria.sort).forEach(function(attr) {

        if (_.isString(criteria.sort[attr])) {
          criteria.sort[attr] = criteria.sort[attr].toLowerCase();

          // Throw error on invalid sort order
          if (criteria.sort[attr] !== 'asc' && criteria.sort[attr] !== 'desc') {
            throw new WLUsageError('Invalid sort criteria :: ' + criteria.sort);
          }
        }

        if (criteria.sort[attr] === 'asc') criteria.sort[attr] = 1;
        if (criteria.sort[attr] === 'desc') criteria.sort[attr] = -1;
      });

      // normalize binary sorting criteria
      Object.keys(criteria.sort).forEach(function(attr) {
        if (criteria.sort[attr] === 0) criteria.sort[attr] = -1;
      });

      // Verify that user either specified a proper object
      // or provided explicit comparator function
      if (!_.isObject(criteria.sort) && !_.isFunction(criteria.sort)) {
        throw new WLUsageError('Invalid sort criteria for ' + attrName + ' :: ' + direction);
      }
    }

    return criteria;
  },

  // Normalize the capitalization and % wildcards in a like query
  // Returns false if criteria is invalid,
  // otherwise returns normalized criteria obj.
  // Enhancer is an optional function to run on each criterion to preprocess the string
  likeCriteria: function(criteria, attributes, enhancer) {

    // Only accept criteria as an object
    if (criteria !== Object(criteria)) return false;

    criteria = _.clone(criteria);

    if (!criteria.where) criteria = { where: criteria };

    // Apply enhancer to each
    if (enhancer) criteria.where = util.objMap(criteria.where, enhancer);

    criteria.where = { like: criteria.where };

    return criteria;
  },


  // Normalize a result set from an adapter
  resultSet: function(resultSet) {

    // Ensure that any numbers that can be parsed have been
    return util.pluralize(resultSet, numberizeModel);
  },


  /**
   * Normalize the different ways of specifying callbacks in built-in Waterline methods.
   * Switchbacks vs. Callbacks (but not deferred objects/promises)
   *
   * @param  {Function|Handlers} cb
   * @return {Handlers}
   */
  callback: function(cb) {

    // Build modified callback:
    // (only works for functions currently)
    var wrappedCallback;
    if (_.isFunction(cb)) {
      wrappedCallback = function(err) {

        // If no error occurred, immediately trigger the original callback
        // without messing up the context or arguments:
        if (!err) {
          return applyInOriginalCtx(cb, arguments);
        }

        // If an error argument is present, upgrade it to a WLError
        // (if it isn't one already)
        err = errorify(err);

        var modifiedArgs = Array.prototype.slice.call(arguments, 1);
        modifiedArgs.unshift(err);

        // Trigger callback without messing up the context or arguments:
        return applyInOriginalCtx(cb, modifiedArgs);
      };
    }


    //
    // TODO: Make it clear that switchback support it experimental.
    //
    // Push switchback support off until >= v0.11
    // or at least add a warning about it being a `stage 1: experimental`
    // feature.
    //

    if (!_.isFunction(cb)) wrappedCallback = cb;
    return switchback(wrappedCallback, {
      invalid: 'error', // Redirect 'invalid' handler to 'error' handler
      error: function _defaultErrorHandler() {
        console.error.apply(console, Array.prototype.slice.call(arguments));
      }
    });


    // ????
    // TODO: determine support target for 2-way switchback usage
    // ????

    // Allow callback to be -HANDLED- in different ways
    // at the app-level.
    // `cb` may be passed in (at app-level) as either:
    //    => an object of handlers
    //    => or a callback function
    //
    // If a callback function was provided, it will be
    // automatically upgraded to a simplerhandler object.
    // var cb_fromApp = switchback(cb);

    // Allow callback to be -INVOKED- in different ways.
    // (adapter def)
    // var cb_fromAdapter = cb_fromApp;

  }
};

// If any attribute looks like a number, but it's a string
// cast it to a number
function numberizeModel(model) {
  return util.objMap(model, numberize);
}


// If specified attr looks like a number, but it's a string, cast it to a number
function numberize(attr) {
  if (_.isString(attr) && isNumbery(attr) && parseInt(attr, 10) < Math.pow(2, 53)) return +attr;
  else return attr;
}

// Returns whether this value can be successfully parsed as a finite number
function isNumbery(value) {
  return Math.pow(+value, 2) > 0;
}

// Replace % with %%%
function escapeLikeQuery(likeCriterion) {
  return likeCriterion.replace(/[^%]%[^%]/g, '%%%');
}

// Replace %%% with %
function unescapeLikeQuery(likeCriterion) {
  return likeCriterion.replace(/%%%/g, '%');
}


/**
 * Like _.partial, but accepts an array of arguments instead of
 * comma-seperated args (if _.partial is `call`, this is `apply`.)
 * The biggest difference from `_.partial`, other than the usage,
 * is that this helper actually CALLS the partially applied function.
 *
 * This helper is mainly useful for callbacks.
 *
 * @param  {Function} fn   [description]
 * @param  {[type]}   args [description]
 * @return {[type]}        [description]
 */

function applyInOriginalCtx(fn, args) {
  return (_.partial.apply(null, [fn].concat(Array.prototype.slice.call(args))))();
}
