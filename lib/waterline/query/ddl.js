/**
 * DDL Queries
 */

module.exports = {

  /**
   * Describe a collection
   */

  describe: function(cb) {
    this._adapter.adapter.describe(cb);
  },

  /**
   * Alter a table/set/etc
   */

  alter: function(attributes, cb) {
    this._adapter.adapter.alter(attributes, cb);
  },

  /**
   * Drop a table/set/etc
   */

  drop: function(cb) {
    this._adapter.adapter.drop(cb);
  }

};
