/**
 * Dynamic Queries
 *
 * Query the collection using the name of the attribute directly
 */

var _ = require('lodash'),
    usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    hasOwnProperty = utils.object.hasOwnProperty;

module.exports = {

  /**
   * buildDynamicFinders
   *
   * Attaches shorthand dynamic methods to the prototype for each attribute
   * in the schema.
   */

  buildDynamicFinders: function() {

    // For each defined attribute, create a dynamic finder function
    for(var attrName in this._schema.schema) {

      // Check if attribute is an association, if so generate limited dynamic finders
      if(hasOwnProperty(this._schema.schema[attrName], 'foreignKey')) {
        this.generateAssociationFinders(attrName);
        return;
      }

      this.generateDynamicFinder(attrName, 'findOneBy*');
      this.generateDynamicFinder(attrName, 'findOneBy*In');
      this.generateDynamicFinder(attrName, 'findOneBy*Like');

      this.generateDynamicFinder(attrName, 'findBy*');
      this.generateDynamicFinder(attrName, 'findBy*In');
      this.generateDynamicFinder(attrName, 'findBy*Like');

      this.generateDynamicFinder(attrName, 'countBy*');
      this.generateDynamicFinder(attrName, 'countBy*In');
      this.generateDynamicFinder(attrName, 'countBy*Like');

      this.generateDynamicFinder(attrName, '*StartsWith', true);
      this.generateDynamicFinder(attrName, '*Contains', true);
      this.generateDynamicFinder(attrName, '*EndsWith', true);
    }
  },


  /**
   * generateDynamicFinder
   *
   * Creates a dynamic method based off the schema. Used for shortcuts for various
   * methods where a criteria object can automatically be built.
   *
   * @param {String} attrName
   * @param {String} method
   * @param {Boolean} dont capitalize the attrName or do, defaults to false
   */

  generateDynamicFinder: function(attrName, method, dontCapitalize) {
    var self = this,
        criteria;

    // Capitalize Attribute Name for camelCase
    var preparedAttrName = dontCapitalize ? attrName : utils.capitalize(attrName);

    // Figure out actual dynamic method name by injecting attribute name
    var actualMethodName = method.replace(/\*/g, preparedAttrName);

    // Assign this finder to the collection
    this[actualMethodName] = function dynamicMethod(value, options, cb) {

      if(typeof options === 'function') {
        cb = options;
        options = null;
      }

      options = options || {};

      var usage = utils.capitalize(self.identity) + '.' + actualMethodName + '(someValue,[options],callback)';

      if(typeof value === 'undefined') return usageError('No value specified!', usage, cb);
      if(options.where) return usageError('Cannot specify `where` option in a dynamic ' + method + '*() query!', usage, cb);

      // Build criteria query and submit it
      options.where = {};
      options.where[attrName] = value;

      // Make modifications based on method as necessary
      if(method === 'findOneBy*' || method === 'findOneBy*In') return self.findOne(options, cb);
      if(method === 'findOneBy*Like') {
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.findOne(criteria, cb);
      }

      // Aggregate finders
      if(method === 'findBy*' || method === 'findBy*In') return self.find(options, cb);
      if(method === 'findBy*Like') {
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.find(criteria, cb);
      }

      // Count finders
      if(method === 'countBy*' || method === 'countBy*In') return self.count(options, cb);
      if(method === 'countBy*Like') {
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.count(criteria, cb);
      }

      // Searchers
      if (method === '*StartsWith') return self.startsWith(options, cb);
      if (method === '*Contains') return self.contains(options, cb);
      if (method === '*EndsWith') return self.endsWith(options, cb);
    };
  },


  /**
   * generateAssociationFinders
   *
   * Generate Dynamic Finders for an association.
   * Adds a .findBy<name>() method for has_one and belongs_to associations.
   *
   * @param {String} attrName, the column name of the attribute
   */

  generateAssociationFinders: function(attrName) {
    var self = this,
        name, model;

    // Find the user defined key for this attrName, look in self defined columnName
    // properties and if that's not set see if the generated columnName matches the attrName
    for(var key in this._attributes) {

      // Cache the value
      var cache = this._attributes[key];

      if(!hasOwnProperty(cache, 'model')) continue;

      if(cache.model.toLowerCase() + '_id' === attrName) {
        name = key;
        model = cache.model;
      }
    }

    if(!name || !model) return;

    // Build a findOneBy<attrName> dynamic finder that forces a join on the association
    this['findOneBy' + utils.capitalize(name)] = function dynamicAssociationMethod(value, cb) {

      // Check proper usage
      var usage = utils.capitalize(self.identity) + '.' + 'findBy' + utils.capitalize(name) +
        '(someValue, callback)';

      if(typeof value === 'undefined') return usageError('No value specified!', usage, cb);
      if(typeof value === 'function') return usageError('No value specified!', usage, cb);

      var criteria = associationQueryCriteria(value);
      return this.findOne(criteria, cb);
    };

    // Build a findBy<attrName> dynamic finder that forces a join on the association
    this['findBy' + utils.capitalize(name)] = function dynamicAssociationMethod(value, cb) {

      // Check proper usage
      var usage = utils.capitalize(self.identity) + '.' + 'findBy' + utils.capitalize(name) +
        '(someValue, callback)';

      if(typeof value === 'undefined') return usageError('No value specified!', usage, cb);
      if(typeof value === 'function') return usageError('No value specified!', usage, cb);

      var criteria = associationQueryCriteria(value);
      return this.find(criteria, cb);
    };

    /**
     * Build Join Array
     */

    function buildJoin() {
      var pk, attr;

      // Set the attr value to the generated schema attribute
      attr = self.waterline.schema[self.identity].attributes[name];

      // Get the current collection's primary key attribute
      Object.keys(self._attributes).forEach(function(key) {
        if(hasOwnProperty(self._attributes[key], 'primaryKey')) {
          pk = key;
        }
      });

      if(!attr) throw new Error('Attempting to populate an attribute that doesn\'t exist');

      // Grab the key being populated to check if it is a has many to belongs to
      // If it's a belongs_to the adapter needs to know that it should replace the foreign key
      // with the associated value.
      var parentKey = self.waterline.collections[self.identity].attributes[name];


      // Build the initial join object that will link this collection to either another collection
      // or to a junction table.
      join = {
        parent: self._tableName,
        parentKey: attr.columnName || pk,
        child: attr.references,
        childKey: attr.on,
        select: true,
        removeParentKey: parentKey.model ? true : false
      };

      return join;
    }

    /**
     * Query Criteria Builder for associations
     */

    function associationQueryCriteria(value) {

      // Build a criteria object
      var criteria = {
        where: {},
        joins: []
      };

      // Build a join condition
      var join = buildJoin();
      criteria.joins.push(join);

      // Add where values
      criteria.where[attrName] = value;
      return criteria;
    }
  }

};
