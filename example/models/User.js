/**
 * Example User Model
 *
 */

var Waterline = require('waterline');

var User = Waterline.Model.extend({

  /**
   * Set Table Name to whatever you want
   */

  tableName: 'waterline_user',

  /**
   * Attributes are equal to Database Columns
   * in a relational database or documents in a
   * document-oriented database.
   */

  attributes: {
    first_name: {
      type: 'string',
      minLength: 5,
      required: true
    },

    last_name: {
      type: 'string',
      minLength: 5,
      required: true
    },

    username: {
      type: 'string',
      minLength: 2,
      maxLength: 20,
      unique: true,
      required: true,

      // Custom Column Names can be used in an attributes object:
      columnName: 'login'
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

    /**
     * Instance Methods
     */

    fullName: function() {
      return this.first_name + ' ' + this.last_name;
    }
  },


  /**
   * Callbacks
   *
   * Run before and after various stages:
   *
   * beforeValidation
   * afterValidation
   * beforeUpdate
   * afterUpdate
   * beforeCreate
   * afterCreate
   * beforeDestroy
   * afterDestroy
   */

  beforeCreate: function(values, cb) {
    encrypt(values.password, function(err, password) {
      if(err) return cb(err);

      delete values.password;
      values.secure_password = password;
      cb();
    });
  }

});

/*************************************************************************
 * USAGE EXAMPLES
 *************************************************************************/

// Find with query builder
User
.find({ name: 'mike' })
.limit(10)
.exec(function(err, users) {
  // do something here
});

// Find a single record with callback interface
User.findOne({ id: 7 }, function(err, user) {
  // do something here

  // Example of using an instance method
  var fullName = user.fullName()
});
