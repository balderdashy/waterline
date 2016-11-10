/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');



/**
 * normalizeCriteria()
 *
 * Validate and normalize the provided value (`criteria`), hammering it destructively
 * into the standardized format suitable to be part of a "stage 2 query" (see ARCHITECTURE.md).
 * This allows us to present it in a normalized fashion to lifecycle callbacks, as well to
 * other internal utilities within Waterline.
 *
 * Since the provided value _might_ be a string, number, or some other primitive that is
 * NOT passed by reference, this function has a return value: a dictionary (plain JavaScript object).
 * But realize that this is only to allow for a handful of edge cases.  Most of the time, the
 * provided value will be irreversibly mutated in-place, AS WELL AS returned.
 *
 * --
 *
 * There are many criteria normalization steps performed by Waterline.
 * But this function only performs some of them.
 *
 * It DOES:
 * (•) validate the criteria's format (particularly the `where` clause)
 * (•) normalize the structure of the criteria (particularly the `where` clause)
 * (•) ensure defaults exist for `limit`, `skip`, `sort`, `select`, and `omit`
 * (•) apply (logical, not physical) schema-aware validations and normalizations
 *
 * It DOES NOT:
 * (x) transform attribute names to column names
 * (x) check that the criteria isn't trying to use features which are not supported by the adapter(s)
 *
 * --
 *
 * @param  {Ref} criteria    [The original criteria (i.e. from a "stage 1 query")]
 *
 * @param {String?} modelIdentity
 *        The identity of the model this criteria is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref?} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized criteria, ready for use in a stage 1 query.
 *
 *
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in the provided criteria.
 *         @property {String} code
 *                   - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the criteria indicates that it should never match anything.
 *         @property {String} code
 *                   - E_WOULD_RESULT_IN_NOTHING
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeCriteria(criteria, modelIdentity, orm) {


  // Sanity checks.
  // > These are just some basic, initial usage assertions to help catch
  // > bugs during development of Waterline core.

  // At this point, `criteria` MUST NOT be undefined.
  // (Any defaulting related to that should be taken care of before calling this function.)
  assert(!_.isUndefined(criteria), new Error('Consistency violation: `criteria` should never be `undefined` when it is passed in to the normalizeCriteria() utility.'));

  // If EITHER `modelIdentity` or `orm` is provided, then they BOTH must be provided, and valid.
  if (!_.isUndefined(modelIdentity) || !_.isUndefined(orm)) {
    var ERR_MSG_PREFIX = 'Consistency violation: If `orm` or `modelIdentity` are provided, then ';
    assert(_.isString(modelIdentity) && modelIdentity !== '', new Error(ERR_MSG_PREFIX+'`modelIdentity` must be a non-empty string.'));
    assert(_.isObject(orm) && !_.isArray(orm) && !_.isFunction(orm), new Error(ERR_MSG_PREFIX+'`orm` must be a valid Waterline ORM instance (must be a dictionary)'));
    assert(_.isObject(orm.collections) && !_.isArray(orm.collections) && !_.isFunction(orm.collections), new Error(ERR_MSG_PREFIX+'`orm` must be a valid Waterline ORM instance (must have a dictionary of "collections")'));
  }//>-•



  // If `modelIdentity` and `orm` were provided, look up the model definition.
  // (Otherwise, we leave `modelDef` set to `undefined`.)
  var modelDef;
  if (orm) {
    modelDef = orm.collections[modelIdentity];

    // If the model definition exists, do a couple of quick sanity checks on it.
    assert(!_.isUndefined(modelDef), new Error('Provided `modelIdentity` references a model (`'+modelIdentity+'`) which does not exist in the provided `orm`.'));
    assert(_.isObject(modelDef) && !_.isArray(modelDef) && !_.isFunction(modelDef), new Error('The referenced model definition (`'+modelIdentity+'`) must be a dictionary)'));
    assert(_.isObject(modelDef.attributes) && !_.isArray(modelDef.attributes) && !_.isFunction(modelDef.attributes), new Error('The referenced model definition (`'+modelIdentity+'`) must have a dictionary of `attributes`)'));
  }//>-




  //   ██████╗ ██████╗ ███╗   ███╗██████╗  █████╗ ████████╗██╗██████╗ ██╗██╗     ██╗████████╗██╗   ██╗
  //  ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝██║██╔══██╗██║██║     ██║╚══██╔══╝╚██╗ ██╔╝
  //  ██║     ██║   ██║██╔████╔██║██████╔╝███████║   ██║   ██║██████╔╝██║██║     ██║   ██║    ╚████╔╝
  //  ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██╔══██║   ██║   ██║██╔══██╗██║██║     ██║   ██║     ╚██╔╝
  //  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║  ██║   ██║   ██║██████╔╝██║███████╗██║   ██║      ██║
  //   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝╚═════╝ ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝
  //

  // If criteria is `false`, keep it that way.
  if (criteria === false) {
    throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error('In previous versions of Waterline, a criteria of `false` indicated that the specified query should simulate no matches.'));
  }//-•

  // If criteria is otherwise falsey (false, null, empty string, NaN, zero, negative zero)
  // then understand it to mean the empty criteria (`{}`), which simulates ALL matches.
  // Note that backwards-compatible support for this could be removed at any time!
  if (!criteria) {
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified criteria '+
      '(`'+util.inspect(criteria,{depth:null})+'`) would match ALL records in '+
      'this model.  If that is what you are intending to happen, then please pass '+
      'in `{}` instead, which is a more explicit and future-proof way of doing '+
      'the same thing.\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in an upcoming release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then the query will fail with an error.'
    );
    return {};
  }


  // If the provided criteria is an array, string, or number, then understand it as
  // a primary key, or as an array of primary key values.
  //
  // ---------------------------------------------------------------------------------
  // Or it could be a .findOrCreateEach?  (if it's an array I mean)
  //  ^
  //  |_TODO: too confusing, should change how that works
  // ---------------------------------------------------------------------------------
  if (_.isArray(criteria) || _.isNumber(criteria) || _.isString(criteria)) {
    try {

      // Look up the primary key attribute for this model, and get its type.
      // TODO

      // TODO: make this schema-aware (using the type above)
      var pkValues = normalizePkValues(criteria);

      // If there is only one item in the array at this point, then do a direct
      // lookup by primary key value.
      if (false) {
        // TODO
      }
      // Otherwise, build it into an `in` query.
      else {
        // TODO
      }

    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUES':
          var baseErrMsg;
          if (_.isArray(criteria)){
            baseErrMsg = 'The specified criteria is an array, which means it must be shorthand notation for an `in` operator.  But this particular array could not be interpreted.';
          }
          else {
            baseErrMsg = 'The specified criteria is a string or number, which means it must be shorthand notation for a lookup by primary key.  But the provided primary key value could not be interpreted.';
          }
          throw flaverr('E_HIGHLY_IRREGULAR', new Error(baseErrMsg+'  Details: '+e.message));

        default:
          throw e;
      }//</switch>
    }//</catch>
  }//>-•




  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===


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
  var CLEAR_WHERE = false;//<< unused?
  if (_.keys(criteria.where).length === 0 && CLEAR_WHERE) {
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







  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // < additional validation / normalization  -- brought in from "forge">
  // TODO: merge this stuff w/ the code above
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Sanity check: Assert that `criteria` is a dictionary.
  if (!_.isPlainObject(criteria)) {
    throw new Error('Consistency violation: At this point, the criteria should have already been normalized into a dictionary!');
  }

  // Validate/normalize `select` clause.
  if (!_.isUndefined(criteria.select)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `select` clause was provided, give it a default value.
  else {
    criteria.select = ['*'];
  }

  // Validate/normalize `omit` clause.
  if (!_.isUndefined(criteria.omit)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `omit` clause was provided, give it a default value.
  else {
    criteria.omit = [];
  }

  // Validate/normalize `where` clause.
  if (!_.isUndefined(criteria.where)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `where` clause was provided, give it a default value.
  else {
    criteria.where = {};
  }

  // Validate/normalize `limit` clause.
  if (!_.isUndefined(criteria.limit)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `limit` clause was provided, give it a default value.
  else {
    criteria.limit = Number.MAX_SAFE_INTEGER;
  }

  // Validate/normalize `skip` clause.
  if (!_.isUndefined(criteria.skip)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `skip` clause was provided, give it a default value.
  else {
    criteria.skip = 0;
  }

  // Validate/normalize `sort` clause.
  if (!_.isUndefined(criteria.sort)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `sort` clause was provided, give it a default value.
  else {
    criteria.sort = [];
  }


  // For compatibility, tolerate the presence of a `.populates` on the
  // criteria dictionary (but scrub that sucker off right away).
  delete criteria.populates;

  // Ensure there aren't any extraneous properties.
  // TODO

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // </ additional validation / normalization -- brought in from "forge">
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -





  // Return the normalized criteria object
  return criteria;
};
