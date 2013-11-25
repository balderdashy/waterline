var _ = require('underscore');
var util = require('./helpers');

var normalize = module.exports = {

  // Normalize the different ways of specifying criteria into a uniform object
  // Schema var only required when origCriteria isn't an object
  criteria: function(origCriteria, schema) {
    var criteria = _.clone(origCriteria);


    softDelete = (typeof schema.deletedAt === 'object') ? true : false;

    if(!criteria) {
      if (softDelete) {
        return {
          where: {
            deletedAt: null
          }
        };
      } else {
        return {
          where: null
        };
      }
    }

    // Empty undefined values from criteria object
    _.each(criteria, function(val, key) {
      if(_.isUndefined(val)) criteria[key] = null;
    });

    // Convert non-objects (ids) into a criteria
    // TODO: use customizable primary key attribute
    if(!_.isObject(criteria)) {
      criteria = {};
      criteria[schema.pk] = +criteria || criteria;
    }

    // Return string to indicate an error
    if(!_.isObject(criteria)) throw new Error('Invalid options/criteria :: ' + criteria);

    // If criteria doesn't seem to contain operational keys, assume all the keys are criteria
    if(!criteria.where && !criteria.limit && !criteria.skip
       && !criteria.sort && !criteria.sum && !criteria.average
       && !criteria.groupBy && !criteria.min && !criteria.max) {

      // Delete any residuals and then use the remaining keys as attributes in a criteria query
      delete criteria.where;
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
      if (softDelete) {
        criteria.where = {
          deletedAt: null
        };
      } else {
        criteria.where = null;
      }
    }

    // If the user wants soft delete
    if (softDelete && criteria.where && !criteria.where.deletedAt) {
      criteria.where.deletedAt = null;
    }

    // If a LIKE was specified, normalize it
    if(criteria.where && criteria.where.like) {
      _.each(criteria.where.like, function(criterion, attrName) {
        criteria.where.like[attrName] = normalizePercentSigns(criterion);
      });
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
