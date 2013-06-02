/**
 * Example User Model
 *
 */

var Waterline = require('../../../lib/waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'test',

  attributes: {
    first_name: {
      type: 'string',
      length: { min: 5 },
      required: true
    },

    last_name: {
      type: 'string',
      length: { min: 5 },
      required: true
    },

    username: {
      type: 'string',
      length: { min: 2, max: 20 },
      unique: true,
      required: true
    },

    email: {
      type: 'email',
      unique: true,
      required: true
    },

    phone_number: {
      type: 'string',
      defaultsTo: '555-555-555'
    },

    full_name: function() {
      return this.first_name + ' ' + this.last_name;
    }
  }

});
