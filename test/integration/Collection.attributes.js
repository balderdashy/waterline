var Model = require('./fixtures/model.fixture'),
    assert = require('assert');

describe('Waterline Collection', function() {
  var User;

  before(function(done) {
    new Model(function(err, collection) {
      if(err) return done(err);
      User = collection;
      done();
    });
  });

  describe('schema', function() {

    it('should create an internal schema from the attributes', function() {
      assert(typeof User._schema === 'object');
      assert(Object.keys(User._schema).length === 8); // account for auto created keys (pk, timestamps)
    });

    // TO-DO
    // Check all schema properties from Sails work

  });

  describe('validations', function() {

    it('should create an internal validation object from the attributes', function() {
      assert(typeof User._validator.validations === 'object');
      assert(Object.keys(User._validator.validations).length === 4);
    });

    // TO-DO
    // Validate properties using Anchor with the Validator in waterline

  });

  describe('instance methods', function() {

    it('should create an internal instanceMethods object from the attributes', function() {
      assert(typeof User._instanceMethods === 'object');
    });

  });

});
