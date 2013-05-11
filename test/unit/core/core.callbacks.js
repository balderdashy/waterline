var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Lifecycle Callbacks', function() {

  describe('mapping internal object', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: 'string'
        },

        beforeCreate: function() {},
        afterCreate: function() {},
        invalidState: function() {}
      });

      person = new Person();
    });

    it('should build a callbacks object', function() {
      assert(Object.keys(person._callbacks).length === 2);
      assert(typeof person._callbacks.beforeCreate === 'function');
      assert(typeof person._callbacks.afterCreate === 'function');
    });

    it('should ignore invalid lifecycle states', function() {
      assert(!person._callbacks.invalidState);
    });

  });
});
