/**
 * DDL Queries
 */

module.exports = {

  /**
   * Describe a collection
   */

  describe: function(cb) {
    this._adapter.adapter.describe(this.identity, cb);
  },

  /**
   * Alter a table/set/etc
   */

  alter: function(attributes, cb) {
    this._adapter.adapter.alter(this.identity, attributes, cb);
  },

  /**
   * Drop a table/set/etc
   */

  drop: function(cb) {
    this._adapter.adapter.drop(this.identity, cb);
  }

};
