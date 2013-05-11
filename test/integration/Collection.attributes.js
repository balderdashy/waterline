var Model = require('./fixtures/model.fixture'),
    assert = require('assert'),
    User = new Model();

describe('Waterline Collection', function() {

  describe('schema', function() {

    it('should create an internal schema from the attributes', function() {
      assert(typeof User._schema === 'object');
      assert(Object.keys(User._schema).length === 5);
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
      assert(Object.keys(User._instanceMethods).length === 1);
    });

  });

});
