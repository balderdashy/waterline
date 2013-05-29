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
    }
  },


  /**
   * Callbacks
   *
   * Run before and after various stages:
   *
   * beforeValidation
   * afterValidation
   * beforeSave
   * afterSave
   * beforeCreate
   * afterCreate
   * beforeDestroy
   * afterDestroy
   */

  beforeCreate: function(cb) {
    var self = this;

    encrypt(this.password, function(err, password) {
      if(err) return next(err);

      self.secure_password = password;
      next();
    });
  },

  /**
   * Instance Methods
   */

  name: function() {
    return this.first_name + ' ' + this.last_name;
  }

});


User
.findAll({name: 'mike'})
.limit(10)
.join('Message')
.done(function(err, users) {

});


User.find(7, function(err, user) {
  user.messages(function(err, message) {
    // message is an instance of the message model
    message.from
  });

  user.message
});
