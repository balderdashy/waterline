/**
 * DDL Queries
 */

module.exports = {

  /**
   * Describe a collection
   */

  describe: function(cb) {
    this.adapter.describe(cb);
  },

  /**
   * Alter a table/set/etc
   */

  alter: function(attributes, cb) {
    this.adapter.alter(attributes, cb);
  },

  /**
   * Drop a table/set/etc
   */

  drop: function(cb) {
    this.adapter.drop(cb);
  }

};
