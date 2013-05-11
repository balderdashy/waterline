var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with instance methods on attributes', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: { type: 'STRING' },
          last_name: { type: 'STRING' },
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          }
        }
      });

      person = new Person();
    });

    it('should set internal instanceMethod attributes', function() {
      assert(typeof person._instanceMethods.full_name === 'function');
    });

  });
});
