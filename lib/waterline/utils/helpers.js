/**
 * Basic Helper Functions
 * Taken from Sails:
 * https://github.com/balderdashy/sails/blob/master/lib/util/index.js
 */

var _ = require('underscore');

module.exports = {

  // ### _.objMap
  // _.map for objects, keeps key/value associations
  objMap: function(input, mapper, context) {
    return _.reduce(input, function(obj, v, k) {
      obj[k] = mapper.call(context, v, k, input);
      return obj;
    }, {}, context);
  },

  /**
   * Run a method meant for a single object on a object OR array
   * For an object, run the method and return the result.
   * For a list, run the method on each item return the resulting array.
   * For anything else, return it silently.
   */
  pluralize: function pluralize(collection, application) {
    if(_.isArray(collection)) {
      return _.map(collection, application);
    } else if(_.isObject(collection)) {
      return application(collection);
    } else return collection;
  },

  capitalize : function(str){
    str = str == null ? '' : String(str);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

};