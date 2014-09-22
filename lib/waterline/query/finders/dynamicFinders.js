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

var finder = module.exports = {};

/**
 * buildDynamicFinders
 *
 * Attaches shorthand dynamic methods to the prototype for each attribute
 * in the schema.
 */

finder.buildDynamicFinders = function() {
  var self = this;

  // For each defined attribute, create a dynamic finder function
  Object.keys(this._schema.schema).forEach(function(attrName) {

    // Check if attribute is an association, if so generate limited dynamic finders
    if (hasOwnProperty(self._schema.schema[attrName], 'foreignKey')) {
      if (self.associationFinders !== false) {
        self.generateAssociationFinders(attrName);
      }
      return;
    }

    var capitalizedMethods = ['findOneBy*', 'findOneBy*In', 'findOneBy*Like', 'findBy*', 'findBy*In',
      'findBy*Like', 'countBy*', 'countBy*In', 'countBy*Like'];

    var lowercasedMethods = ['*StartsWith', '*Contains', '*EndsWith'];


    if (self.dynamicFinders !== false) {
      capitalizedMethods.forEach(function(method) {
        self.generateDynamicFinder(attrName, method);
      });
      lowercasedMethods.forEach(function(method) {
        self.generateDynamicFinder(attrName, method, true);
      });
    }
  });
};


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

finder.generateDynamicFinder = function(attrName, method, dontCapitalize) {
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

    switch(method) {


      ///////////////////////////////////////
      // Finders
      ///////////////////////////////////////


      case 'findOneBy*':
      case 'findOneBy*In':
        return self.findOne(options, cb);

      case 'findOneBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.findOne(criteria, cb);


      ///////////////////////////////////////
      // Aggregate Finders
      ///////////////////////////////////////


      case 'findBy*':
      case 'findBy*In':
        return self.find(options, cb);

      case 'findBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.find(criteria, cb);


      ///////////////////////////////////////
      // Count Finders
      ///////////////////////////////////////


      case 'countBy*':
      case 'countBy*In':
        return self.count(options, cb);

      case 'countBy*Like':
        criteria = _.extend(options, {
          where: {
            like: options.where
          }
        });

        return self.count(criteria, cb);


      ///////////////////////////////////////
      // Searchers
      ///////////////////////////////////////

      case '*StartsWith':
        return self.startsWith(options, cb);

      case '*Contains':
        return self.contains(options, cb);

      case '*EndsWith':
        return self.endsWith(options, cb);
    }
  };
};


/**
 * generateAssociationFinders
 *
 * Generate Dynamic Finders for an association.
 * Adds a .findBy<name>() method for has_one and belongs_to associations.
 *
 * @param {String} attrName, the column name of the attribute
 */

finder.generateAssociationFinders = function(attrName) {
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

    var criteria = associationQueryCriteria(self, value, attrName);
    return this.findOne(criteria, cb);
  };

  // Build a findBy<attrName> dynamic finder that forces a join on the association
  this['findBy' + utils.capitalize(name)] = function dynamicAssociationMethod(value, cb) {

    // Check proper usage
    var usage = utils.capitalize(self.identity) + '.' + 'findBy' + utils.capitalize(name) +
      '(someValue, callback)';

    if(typeof value === 'undefined') return usageError('No value specified!', usage, cb);
    if(typeof value === 'function') return usageError('No value specified!', usage, cb);

    var criteria = associationQueryCriteria(self, value, attrName);
    return this.find(criteria, cb);
  };
};


/**
 * Build Join Array
 */

function buildJoin() {
  var self = this,
      pk, attr;

  // Set the attr value to the generated schema attribute
  attr = self.waterline.schema[self.identity].attributes[name];

  // Get the current collection's primary key attribute
  Object.keys(self._attributes).forEach(function(key) {
    if(hasOwnProperty(self._attributes[key], 'primaryKey') && self._attributes[key].primaryKey) {
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
  var join = {
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

function associationQueryCriteria(context, value, attrName) {

  // Build a criteria object
  var criteria = {
    where: {},
    joins: []
  };

  // Build a join condition
  var join = buildJoin.call(context);
  criteria.joins.push(join);

  // Add where values
  criteria.where[attrName] = value;
  return criteria;
}
