/**
 * Dynamic Queries
 *
 * Query the collection using the name of the attribute directly
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    _ = require('underscore');

module.exports = {

  buildDynamicFinders: function() {

    // For each defined attribute, create a dynamic finder function
    for(var attrName in this._schema.schema) {
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

        return self.find(criteria, cb);
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
  }

};
