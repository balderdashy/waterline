var util = require('util');
var assert = require('assert');
var reduceAssociations = require('../../../lib/waterline/utils/nestedOperations/reduceAssociations');


describe('nestedOperations / reduceAsscociations', function () {

  // Identity of model
    var model = 'foo';

    // Our schema (all the models) represented as an object
    var schema = {
      foo: {
        attributes: {
          // put nothing in here
        }
      }
    };

    // Values (an object of properties passed in by a user for a create or update)
    var values = {
      name: 'Rob Weasley',
      age: 45,
      email: 'rob@hogwarts.edu'
    };

  it('should not throw when the values reference non-existent attributes', function () {

    assert.doesNotThrow(function () {
      var result = reduceAssociations(model, schema, values);
    }, util.format('`utils/nestedOperations/reduceAssociations.js` should not throw when `values` specifies an attribute which doesn\'t exist in schema'));

  });
});
