//  ███╗   ██╗ ██████╗ ██████╗ ███╗   ███╗ █████╗ ██╗     ██╗███████╗███████╗
//  ████╗  ██║██╔═══██╗██╔══██╗████╗ ████║██╔══██╗██║     ██║╚══███╔╝██╔════╝
//  ██╔██╗ ██║██║   ██║██████╔╝██╔████╔██║███████║██║     ██║  ███╔╝ █████╗
//  ██║╚██╗██║██║   ██║██╔══██╗██║╚██╔╝██║██╔══██║██║     ██║ ███╔╝  ██╔══╝
//  ██║ ╚████║╚██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██║███████╗██║███████╗███████╗
//  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚══════╝
//
//   ██████╗██████╗ ██╗████████╗███████╗██████╗ ██╗ █████╗
//  ██╔════╝██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║██╔══██╗
//  ██║     ██████╔╝██║   ██║   █████╗  ██████╔╝██║███████║
//  ██║     ██╔══██╗██║   ██║   ██╔══╝  ██╔══██╗██║██╔══██║
//  ╚██████╗██║  ██║██║   ██║   ███████╗██║  ██║██║██║  ██║
//   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
//
// Go through the criteria object and ensure everything looks ok and is presented
// in a normalized fashion to all the methods using it.

var _ = require('lodash');

module.exports = function normalizeCriteria(originalCriteria, clearWhere) {
  var criteria = originalCriteria;

  // If criteria is already false, keep it that way.
  if (criteria === false) {
    return criteria;
  }

  // If there is no criteria, return an empty criteria
  if (!criteria) {
    return {};
  }

  // Let the calling method normalize array criteria. It could be an IN query
  // where we need the PK of the collection or a .findOrCreateEach
  if (_.isArray(criteria)) {
    return criteria;
  }

  // Empty undefined values from criteria object
  _.each(criteria, function(val, key) {
    if (_.isUndefined(val)) {
      criteria[key] = null;
    }
  });

  // Convert non-objects (ids) into a criteria
  // TODO: use customizable primary key attribute
  if (!_.isObject(criteria)) {
    criteria = {
      id: +criteria || criteria
    };
  }

  // Set the WHERE clause of the criteria object
  if (_.isObject(criteria) && !criteria.where && criteria.where !== null) {
    criteria = {
      where: criteria
    };
  }

  // Pull out any JOINS from the criteria that may have gotten squashed
  if (_.has(criteria.where, 'joins')) {
    criteria.joins = criteria.where.joins;
    delete criteria.where.joins;
  }

  // If it got here and it's still not an object, something is wrong.
  if (!_.isObject(criteria)) {
    throw new Error('Invalid options/criteria :: ' + criteria);
  }

  // If criteria doesn't seem to contain operational keys, assume all the keys are criteria
  // if (!criteria.joins && !criteria.join && !criteria.limit && !criteria.skip &&
  //   !criteria.sort && !criteria.sum && !criteria.average &&
  //   !criteria.groupBy && !criteria.min && !criteria.max && !criteria.select) {
  //
  //   // Delete any residuals and then use the remaining keys as attributes in a criteria query
  //   delete criteria.where;
  //   delete criteria.joins;
  //   delete criteria.join;
  //   delete criteria.limit;
  //   delete criteria.skip;
  //   delete criteria.sort;
  //   criteria = {
  //     where: criteria
  //   };
  //   console.log('NORMALIZE', criteria);
  // }

  // If where is null, turn it into an object
  if (_.isNull(criteria.where)) {
    criteria.where = {};
  }


  //  ╦  ╦╔╦╗╦╔╦╗
  //  ║  ║║║║║ ║
  //  ╩═╝╩╩ ╩╩ ╩
  // If LIMIT is set on the WHERE clause move it to the top level and normalize
  // it into an integer. If it's less than zero, remove it.
  if (_.has(criteria.where, 'limit')) {
    criteria.limit = criteria.where.limit;
    delete criteria.where.limit;
  }

  if (_.has(criteria, 'limit')) {
    criteria.limit = parseInt(criteria.limit, 10);
    if (criteria.limit < 0) {
      delete criteria.limit;
    }
  }


  //  ╔═╗╦╔═╦╔═╗
  //  ╚═╗╠╩╗║╠═╝
  //  ╚═╝╩ ╩╩╩
  // If SKIP is set on the WHERE clause move it to the top level and normalize
  // it into an integer. If it's less than zero, remove it.
  if (_.has(criteria.where, 'skip')) {
    criteria.skip = criteria.where.skip;
    delete criteria.where.skip;
  }

  if (_.has(criteria, 'skip')) {
    criteria.skip = parseInt(criteria.skip, 10);
    if (criteria.skip < 0) {
      delete criteria.skip;
    }
  }

  //  ╔═╗╔═╗╦═╗╔╦╗
  //  ╚═╗║ ║╠╦╝ ║
  //  ╚═╝╚═╝╩╚═ ╩
  // If SORT is set on the WHERE clause move it to the top level and normalize
  // it into either 'DESC' or 'ASC'.
  if (_.has(criteria.where, 'sort')) {
    criteria.sort = criteria.where.sort;
    delete criteria.where.sort;
  }

  // Normalize SORT into an array of objects with the KEY being the attribute
  // and the value being either 'ASC' or 'DESC'.
  if (_.has(criteria, 'sort')) {
    var _sort = [];
    var _obj = {};

    // Handle String sort. { sort: 'name desc' }
    if (_.isString(criteria.sort)) {
      if (criteria.sort.split(' ').length < 2) {
        throw new Error('Invalid SORT clause in criteria. ' + criteria.sort);
      }

      var key = criteria.sort.split(' ')[0];
      var val = criteria.sort.split(' ')[1].toUpperCase();
      if (val !== 'ASC' && val !== 'DESC') {
        throw new Error('Invalid SORT clause in criteria. Sort direction must be either ASC or DESC. Values used were: ' + criteria.sort);
      }

      _obj[key] = val;
      _sort.push(_obj);
    }

    // Handle Object that could contain multiple keys. { name: 'desc', age: 'asc' }
    if (_.isPlainObject(criteria.sort)) {
      _.each(criteria.sort, function(val, key) {
        var _obj = {};

        // Normalize legacy 1, -1 interface
        if (_.isNumber(val)) {
          if (val === 1) {
            val = 'ASC';
          } else if (val === -1) {
            val = 'DESC';
          } else {
            val = 'DESC';
          }
        }

        _obj[key] = val;
        _sort.push(_obj);
      });
    }

    // Ensure that if the SORT is defined as an array that each item in the array
    // contains an object with exactly one key.
    if (_.isArray(criteria.sort)) {
      _.each(criteria.sort, function(item) {
        if (!_.isPlainObject(item)) {
          throw new Error('Invalid SORT clause in criteria. Sort must contain an array of dictionaries with a single key. ' + criteria.sort);
        }

        if (_.keys(item).length > 1) {
          throw new Error('Invalid SORT clause in criteria. Sort must contain an array of dictionaries with a single key. ' + criteria.sort);
        }

        _sort.push(item);
      });
    }

    // Add the sort criteria to the top level criteria if it was considered valid
    if (_sort.length) {
      criteria.sort = _sort;
    } else {
      throw new Error('Invalid SORT clause in criteria. ' + criteria.sort);
    }
  }


  //  ╔═╗╔═╗╔═╗╦═╗╔═╗╔═╗╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
  //  ╠═╣║ ╦║ ╦╠╦╝║╣ ║ ╦╠═╣ ║ ║║ ║║║║╚═╗
  //  ╩ ╩╚═╝╚═╝╩╚═╚═╝╚═╝╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
  // Pull out aggregation keys from where key
  if (_.has(criteria.where, 'sum')) {
    criteria.sum = criteria.where.sum;
    delete criteria.where.sum;
  }

  if (_.has(criteria.where, 'average')) {
    criteria.average = criteria.where.average;
    delete criteria.where.average;
  }

  if (_.has(criteria.where, 'groupBy')) {
    criteria.groupBy = criteria.where.groupBy;
    delete criteria.where.groupBy;
  }

  if (_.has(criteria.where, 'min')) {
    criteria.min = criteria.where.min;
    delete criteria.where.min;
  }

  if (_.has(criteria.where, 'max')) {
    criteria.max = criteria.where.max;
    delete criteria.where.max;
  }


  //  ╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗
  //  ╚═╗║╣ ║  ║╣ ║   ║
  //  ╚═╝╚═╝╩═╝╚═╝╚═╝ ╩
  if (_.has(criteria.where, 'select')) {
    criteria.select = criteria.where.select;
    delete criteria.where.select;
  }

  if (_.has(criteria, 'select')) {
    // Ensure SELECT is always an array
    if(!_.isArray(criteria.select)) {
      criteria.select = [criteria.select];
    }

    // If the select contains a '*' then remove the whole projection, a '*'
    // will always return all records.
    if(_.includes(criteria.select, '*')) {
      delete criteria.select;
    }
  }


  // If WHERE is {}, always change it back to null
  // TODO: Figure out why this existed
  if (_.keys(criteria.where).length === 0 && clearWhere) {
    // criteria.where = null;
    delete criteria.where;
  }

  // If an IN was specified in the top level query and is an empty array, we can return an
  // empty object without running the query because nothing will match anyway. Let's return
  // false from here so the query knows to exit out.
  var invalidIn = _.find(criteria.where, function(val) {
    if (_.isArray(val) && val.length === 0) {
      return true;
    }
  });

  if (invalidIn) {
    return false;
  }

  // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
  // match it anyway and it can prevent errors in the adapters.
  if (_.has(criteria.where, 'or')) {
    // Ensure `or` is an array
    if (!_.isArray(criteria.where.or)) {
      throw new Error('An `or` clause in a query should be specified as an array of subcriteria');
    }

    _.each(criteria.where.or, function(clause) {
      _.each(clause, function(val, key) {
        if (_.isArray(val) && val.length === 0) {
          clause[key] = undefined;
        }
      });
    });
  }

  // Return the normalized criteria object
  return criteria;
};
