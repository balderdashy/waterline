/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var waterlineCriteria = require('waterline-criteria');

var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var sorter = require('../../utils/sorter');
var Deferred = require('../deferred');
var Joins = require('./joins');
var Operations = require('./operations');
var Integrator = require('../integrator');
var hasOwnProperty = utils.object.hasOwnProperty;

var normalizeCriteria = require('../../utils/normalize-criteria');
var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');




module.exports = {

  /**
   * Find a single record that meets criteria
   *
   * @param {Object} criteria to search
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOne: function(criteria, cb, metaContainer) {
    var self = this;

    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
    }

    // If the criteria is an array of objects, wrap it in an "or"
    if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
      criteria = {or: criteria};
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    criteria = normalize.expandPK(self, criteria);

    // Normalize criteria
    // criteria = normalize.criteria(criteria);
    criteria = normalizeCriteria(criteria, this.identity, this.waterline);

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.findOne, {
        method: 'findOne',
        criteria: criteria
      });
    }


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    //
    // Forge a stage 2 query (aka logical protostatement)
    // This ensures a normalized format.
    var query = {
      method: 'findOne',
      using: this.identity,

      criteria: criteria,
      populates: criteria.populates,

      meta: metaContainer
    };

    try {
      forgeStageTwoQuery(query, this.waterline);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_CRITERIA':
          return cb(
            flaverr(
              { name: 'Usage error' },
              new Error(
                'Invalid criteria.\n'+
                'Details:\n'+
                '  '+e.message+'\n'
              )
            )
          );

        case 'E_INVALID_POPULATES':
          return cb(
            flaverr(
              { name: 'Usage error' },
              new Error(
                'Invalid populate(s).\n'+
                'Details:\n'+
                '  '+e.message+'\n'
              )
            )
          );

        default:
          return cb(e);
      }
    }//>-•


    // TODO
    // This is where the `beforeFindOne()` lifecycle callback would go


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    var operations = new Operations(this, query);


    //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    operations.run(function(err, values) {
      if (err) {
        return cb(err);
      }

      if (!values.cache) {
        return cb();
      }

      // If no joins are used grab the only item from the cache and pass to the returnResults
      // function.
      if (!criteria.joins) {
        values = values.cache[self.identity];
        return returnResults(values);
      }

      // If the values are already combined, return the results
      if (values.combined) {
        return returnResults(values.cache[self.identity]);
      }

      // Find the primaryKey of the current model so it can be passed down to the integrator.
      // Use 'id' as a good general default;
      var primaryKey = 'id';

      Object.keys(self._schema.schema).forEach(function(key) {
        if (self._schema.schema[key].hasOwnProperty('primaryKey') && self._schema.schema[key].primaryKey) {
          primaryKey = key;
        }
      });


      // Perform in-memory joins
      Integrator(values.cache, query.joins, primaryKey, function(err, results) {
        if (err) {
          return cb(err);
        }

        if (!results) {
          return cb();
        }

        // We need to run one last check on the results using the criteria. This allows a self
        // association where we end up with two records in the cache both having each other as
        // embedded objects and we only want one result. However we need to filter any join criteria
        // out of the top level where query so that searchs by primary key still work.
        var tmpCriteria = _.cloneDeep(criteria.where);
        if (!tmpCriteria) {
          tmpCriteria = {};
        }

        query.joins.forEach(function(join) {
          if (!hasOwnProperty(join, 'alias')) {
            return;
          }

          // Check for `OR` criteria
          if (hasOwnProperty(tmpCriteria, 'or')) {
            tmpCriteria.or.forEach(function(search) {
              if (!hasOwnProperty(search, join.alias)) {
                return;
              }
              delete search[join.alias];
            });
            return;
          }

          if (!hasOwnProperty(tmpCriteria, join.alias)) {
            return;
          }
          delete tmpCriteria[join.alias];
        });

        // Pass results into Waterline-Criteria
        var _criteria = { where: tmpCriteria };
        results = waterlineCriteria('parent', { parent: results }, _criteria).results;

        results.forEach(function(res) {

          // Go Ahead and perform any sorts on the associated data
          query.joins.forEach(function(join) {
            if (!join.criteria) {
              return;
            }
            var c = normalize.criteria(join.criteria);
            if (!c.sort) {
              return;
            }

            var alias = join.alias;
            res[alias] = sorter(res[alias], c.sort);
          });
        });

        returnResults(results);
      });

      function returnResults(results) {

        if (!results) {
          return cb();
        }

        // Normalize results to an array
        if (!Array.isArray(results) && results) {
          results = [results];
        }

        // Unserialize each of the results before attempting any join logic on them
        var unserializedModels = [];
        results.forEach(function(result) {
          unserializedModels.push(self._transformer.unserialize(result));
        });

        var models = [];
        var joins = query.joins ? query.joins : [];
        var data = new Joins(joins, unserializedModels, self.identity, self._schema.schema, self.waterline.collections);

        // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
        if (!data || !data.models || !data.models.forEach) {
          return cb(new Error('Values returned from operations set are not an array...'));
        }

        // Create a model for the top level values
        data.models.forEach(function(model) {
          models.push(new self._model(model, data.options));
        });

        cb(null, models[0]);
      }
    });
  },

  /**
   * Find All Records that meet criteria
   *
   * @param {Object} search criteria
   * @param {Object} options
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  find: function(criteria, options, cb, metaContainer) {
    var self = this;
    var usage = utils.capitalize(this.identity) + '.find([criteria],[options]).exec(callback|switchback)';

    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;

      if(arguments.length === 1) {
        options = null;
      }
    }

    // If options is a function, we want to check for any more values before nulling
    // them out or overriding them.
    if (typeof options === 'function') {

      // If cb also exists it means there is a metaContainer value
      if (cb) {
        metaContainer = cb;
        cb = options;
        options = null;
      } else {
        cb = options;
        options = null;
      }

    }

    // If the criteria is an array of objects, wrap it in an "or"
    if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
      criteria = {or: criteria};
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    criteria = normalize.expandPK(self, criteria);

    // Fold in criteria options
    if (options === Object(options) && criteria === Object(criteria)) {
      criteria = _.extend({}, criteria, options);
    }


    // Validate Arguments
    if (typeof criteria === 'function' || typeof options === 'function') {
      return usageError('Invalid options specified!', usage, cb);
    }

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.find, {
        method: 'find',
        criteria: criteria,
        values: options
      });
    }


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    //
    // Forge a stage 2 query (aka logical protostatement)
    // This ensures a normalized format.
    var query = {
      method: 'find',
      using: this.identity,

      criteria: criteria,
      populates: criteria.populates,

      meta: metaContainer
    };

    try {
      forgeStageTwoQuery(query, this.waterline);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_CRITERIA':
          return cb(
            flaverr(
              { name: 'Usage error' },
              new Error(
                'Invalid criteria.\n'+
                'Details:\n'+
                '  '+e.message+'\n'
              )
            )
          );

        case 'E_INVALID_POPULATES':
          return cb(
            flaverr(
              { name: 'Usage error' },
              new Error(
                'Invalid populate(s).\n'+
                'Details:\n'+
                '  '+e.message+'\n'
              )
            )
          );

        default:
          return cb(e);
      }
    }//>-•


    // TODO
    // This is where the `beforeFind()` lifecycle callback would go


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    var operations = new Operations(this, query);


    //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
    //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
    operations.run(function(err, values) {
      if (err) {
        return cb(err);
      }

      if (!values.cache) {
        return cb();
      }

      // If no joins are used grab current collection's item from the cache and pass to the returnResults
      // function.
      if (!query.joins) {
        values = values.cache[self.identity];
        return returnResults(values);
      }

      // If the values are already combined, return the results
      if (values.combined) {
        return returnResults(values.cache[self.identity]);
      }

      // Find the primaryKey of the current model so it can be passed down to the integrator.
      // Use 'id' as a good general default;
      var primaryKey = self.primaryKey;

      // Perform in-memory joins
      Integrator(values.cache, query.joins, primaryKey, function(err, results) {
        if (err) {
          return cb(err);
        }

        if (!results) {
          return cb();
        }

        // We need to run one last check on the results using the criteria. This allows a self
        // association where we end up with two records in the cache both having each other as
        // embedded objects and we only want one result. However we need to filter any join criteria
        // out of the top level where query so that searchs by primary key still work.
        var tmpCriteria = _.cloneDeep(criteria.where);
        if (!tmpCriteria) {
          tmpCriteria = {};
        }

        query.joins.forEach(function(join) {
          if (!hasOwnProperty(join, 'alias')) {
            return;
          }

          // Check for `OR` criteria
          if (hasOwnProperty(tmpCriteria, 'or')) {
            tmpCriteria.or.forEach(function(search) {
              if (!hasOwnProperty(search, join.alias)) {
                return;
              }
              delete search[join.alias];
            });
            return;
          }

          if (!hasOwnProperty(tmpCriteria, join.alias)) {
            return;
          }
          delete tmpCriteria[join.alias];
        });

        // Pass results into Waterline-Criteria
        var _criteria = { where: tmpCriteria };
        results = waterlineCriteria('parent', { parent: results }, _criteria).results;

        // Serialize values coming from an in-memory join before modelizing
        results.forEach(function(res) {

          // Go Ahead and perform any sorts on the associated data
          query.joins.forEach(function(join) {
            if (!join.criteria) {
              return;
            }
            var c = normalize.criteria(join.criteria);
            var alias = join.alias;
            if (c.sort) {
              res[alias] = sorter(res[alias], c.sort);
            }

            // If a junction table was used we need to do limit and skip in-memory
            // This is where it gets nasty, paginated stuff here is a pain and needs work
            // Hopefully we can get a chance to re-do it in WL2 and not have this. Basically
            // if you need paginated populates try and have all the tables in the query on the
            // same connection so it can be done in a nice single query.
            if (!join.junctionTable) {
              return;
            }

            if (c.skip) {
              res[alias].splice(0, c.skip);
            }

            if (c.limit) {
              res[alias] = _.take(res[alias], c.limit);
            }
          });
        });

        returnResults(results);
      });

      function returnResults(results) {

        if (!results) {
          return cb(null, []);
        }

        // Normalize results to an array
        if (!Array.isArray(results) && results) {
          results = [results];
        }

        // Unserialize each of the results before attempting any join logic on them
        var unserializedModels = [];

        if (results) {
          results.forEach(function(result) {
            unserializedModels.push(self._transformer.unserialize(result));
          });
        }

        var models = [];
        var joins = query.joins ? query.joins : [];
        var data = new Joins(joins, unserializedModels, self.identity, self.schema, self.waterline.collections);

        // NOTE:
        // If a "belongsTo" (i.e. HAS_FK) association is null, should it be transformed into
        // an empty array here?  That is not what is happening currently, and it can cause
        // unexpected problems when implementing the native join method as an adapter implementor.
        // ~Mike June 22, 2014

        // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
        if (!data || !data.models || !data.models.forEach) {
          return cb(new Error('Values returned from operations set are not an array...'));
        }

        // Create a model for the top level values
        data.models.forEach(function(model) {
          models.push(new self._model(model, data.options));
        });


        cb(null, models);
      }

    });
  },

  where: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },

  select: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },


  /**
   * findAll
   * [[ Deprecated! ]]
   *
   * @param  {Object}   criteria
   * @param  {Object}   options
   * @param  {Function} cb
   */
  findAll: function(criteria, options, cb) {
    if (typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
      options = null;
    }

    if (typeof options === 'function') {
      cb = options;
      options = null;
    }

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.findAll, {
        method: 'findAll',
        criteria: criteria
      });
    }

    cb(new Error('In Waterline >= 0.9, findAll() has been deprecated in favor of find().' +
                '\nPlease visit the migration guide at http://sailsjs.org for help upgrading.'));
  }

};
