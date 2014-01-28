var _ = require('lodash');
var util = require('./helpers');
var switchback = require('node-switchback');

var normalize = module.exports = {

  // Normalize the different ways of specifying criteria into a uniform object
  criteria: function(origCriteria) {
    var criteria = _.cloneDeep(origCriteria);

    if(!criteria) return {
      where: null
    };

    // Empty undefined values from criteria object
    _.each(criteria, function(val, key) {
      if(_.isUndefined(val)) criteria[key] = null;
    });

    // Convert non-objects (ids) into a criteria
    // TODO: use customizable primary key attribute
    if(!_.isObject(criteria)) {
      criteria = {
        id: +criteria || criteria
      };
    }

    // Return string to indicate an error
    if(!_.isObject(criteria)) throw new Error('Invalid options/criteria :: ' + criteria);

    // If criteria doesn't seem to contain operational keys, assume all the keys are criteria
    if(!criteria.where && !criteria.joins && !criteria.join && !criteria.limit && !criteria.skip &&
      !criteria.sort && !criteria.sum && !criteria.average &&
      !criteria.groupBy && !criteria.min && !criteria.max) {

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
    }
    // If where is null, turn it into an object
    else if(_.isNull(criteria.where)) criteria.where = {};

    // If WHERE is {}, always change it back to null
    if(criteria.where && _.keys(criteria.where).length === 0) {
      criteria.where = null;
    }

    // If a LIKE was specified, normalize it
    if(criteria.where && criteria.where.like) {
      _.each(criteria.where.like, function(criterion, attrName) {
        criteria.where.like[attrName] = normalizePercentSigns(criterion);
      });
    }

    // If an IN was specified in the top level query and is an empty array, we can return an
    // empty object without running the query because nothing will match anyway. Let's return
    // false from here so the query knows to exit out.
    if(criteria.where) {
      var falsy = false;
      Object.keys(criteria.where).forEach(function(key) {
        if(Array.isArray(criteria.where[key]) && criteria.where[key].length === 0) {
          falsy = true;
        }
      });

      if(falsy) return false;
    }

    // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
    // match it anyway and it can prevent errors in the adapters
    if(criteria.where && criteria.where.or) {
      var _clone = _.cloneDeep(criteria.where.or);
      criteria.where.or.forEach(function(clause, i) {
        Object.keys(clause).forEach(function(key) {
          if(Array.isArray(clause[key]) && clause[key].length === 0) {
            _clone.splice(i, 1);
          }
        });
      });

      criteria.where.or = _clone;
    }

    // Normalize sort criteria
    if(criteria.sort) {
      // Split string into attr and sortDirection parts (default to 'asc')
      if(_.isString(criteria.sort)) {
        var parts = criteria.sort.split(' ');

        // Set default sort to asc
        parts[1] = parts[1] ? parts[1].toLowerCase() : 'asc';

        // Throw error on invalid sort order
        if(parts[1] !== 'asc' && parts[1] !== 'desc') {
          throw new Error('Invalid sort criteria :: ' + criteria.sort);
        }

        // Expand criteria.sort into object
        criteria.sort = {};
        criteria.sort[parts[0]] = parts[1];
      }

      // normalize ASC/DESC notation
      Object.keys(criteria.sort).forEach(function(attr) {
        if(criteria.sort[attr] === 'asc') criteria.sort[attr] = 1;
        if(criteria.sort[attr] === 'desc') criteria.sort[attr] = -1;
      });

      // normalize binary sorting criteria
      Object.keys(criteria.sort).forEach(function(attr) {
        if(criteria.sort[attr] === 0) criteria.sort[attr] = -1;
      });

      // Verify that user either specified a proper object
      // or provided explicit comparator function
      if(!_.isObject(criteria.sort) && !_.isFunction(criteria.sort)) {
        throw new Error('Invalid sort criteria for ' + attrName + ' :: ' + direction);
      }
    }

    // Move Limit and Skip outside the where criteria
    if(util.object.hasOwnProperty(criteria, 'where') && criteria.where !== null && util.object.hasOwnProperty(criteria.where, 'limit')) {
      delete criteria.where.limit;
      criteria.limit = origCriteria.where.limit;
    }

    if(util.object.hasOwnProperty(criteria, 'where') && criteria.where !== null && util.object.hasOwnProperty(criteria.where, 'skip')) {
      delete criteria.where.skip;
      criteria.skip = origCriteria.where.skip;
    }

    return criteria;
  },

  // Normalize the capitalization and % wildcards in a like query
  // Returns false if criteria is invalid,
  // otherwise returns normalized criteria obj.
  // Enhancer is an optional function to run on each criterion to preprocess the string
  likeCriteria: function(criteria, attributes, enhancer) {

    // Only accept criteria as an object
    if(criteria !== Object(criteria)) return false;

    criteria = _.clone(criteria);

    if(!criteria.where) criteria = { where: criteria };

    // Apply enhancer to each
    if (enhancer) criteria.where = util.objMap(criteria.where, enhancer);

    criteria.where = { like: criteria.where };

    // Look for and handle % signs
    _.each(criteria.where.like, function(criterion, attrName) {
      criteria.where.like[attrName] = normalizePercentSigns(criterion);
    });

    return criteria;
  },


  // Normalize a result set from an adapter
  resultSet: function (resultSet) {

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
  callback: function (cb) {

    return switchback(cb, {
      invalid: 'error', // Redirect 'invalid' handler to 'error' handler
      error: function _defaultErrorHandler () {
        console.error.apply(console, Array.prototype.slice.call(arguments));
      }
    });

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
function numberizeModel (model) {
  return util.objMap(model, numberize);
}


// If specified attr looks like a number, but it's a string, cast it to a number
function numberize (attr) {
  if (_.isString(attr) && isNumbery(attr) && parseInt(attr,10) < Math.pow(2, 53)) return +attr;
  else return attr;
}

// Returns whether this value can be successfully parsed as a finite number
function isNumbery (value) {
  return Math.pow(+value, 2) > 0;
}

// Given a criteria string inside of a "LIKE" criteria object,
// support the use of % signs to add startsWith and endsWith functionality
function normalizePercentSigns(likeCriterion) {
  // If no % signs are specified, wrap it in %
  if(!likeCriterion.match(/%/)) {
    return '%' + likeCriterion + '%';
  } else return likeCriterion;
}


// Replace % with %%%
function escapeLikeQuery(likeCriterion) {
  return likeCriterion.replace(/[^%]%[^%]/g, '%%%');
}

// Replace %%% with %


function unescapeLikeQuery(likeCriterion) {
  return likeCriterion.replace(/%%%/g, '%');
}
