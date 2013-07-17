var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Lifecycle Callbacks', function() {

  /**
   * Automatically build an internal Callbacks object
   * that uses no-op functions.
   */

  describe('default callbacks object', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: 'string'
        },

        invalidState: function() {}
      });

      person = new Person();
    });

    it('should build a callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidation));
      assert(typeof person._callbacks.beforeValidation[0] === 'function');

      assert(Array.isArray(person._callbacks.afterValidation));
      assert(typeof person._callbacks.afterValidation[0] === 'function');

      assert(Array.isArray(person._callbacks.beforeUpdate));
      assert(typeof person._callbacks.beforeUpdate[0] === 'function');

      assert(Array.isArray(person._callbacks.afterUpdate));
      assert(typeof person._callbacks.afterUpdate[0] === 'function');

      assert(Array.isArray(person._callbacks.beforeCreate));
      assert(typeof person._callbacks.beforeCreate[0] === 'function');

      assert(Array.isArray(person._callbacks.afterCreate));
      assert(typeof person._callbacks.afterCreate[0] === 'function');

      assert(Array.isArray(person._callbacks.beforeDestroy));
      assert(typeof person._callbacks.beforeDestroy[0] === 'function');

      assert(Array.isArray(person._callbacks.afterDestroy));
      assert(typeof person._callbacks.afterDestroy[0] === 'function');
    });

    it('should ignore invalid lifecycle states', function() {
      assert(!person._callbacks.invalidState);
    });
  });

  /**
   * Callback states should allow an array to be used
   * and should be able to mutate state.
   */

  describe('callback as an array', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: 'string',

          changeState_1: function() {
            this.name = this.name + ' changed';
          },

          changeState_2: function() {
            this.name = this.name + ' again';
          }
        },

        beforeValidation: ['changeState_1', 'changeState_2']
      });

      person = new Person();
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidation));
      assert(typeof person._callbacks.beforeValidation[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidation.forEach(function(key) {
        key.call(values);
      });

      assert(values.name === 'Foo changed again');
    });
  });

  /**
   * Callback states should allow an string to be used
   * and should be able to mutate state.
   */

  describe('callback as a string', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: 'string',

          changeState_1: function() {
            this.name = this.name + ' changed';
          }
        },

        beforeValidation: 'changeState_1'
      });

      person = new Person();
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidation));
      assert(typeof person._callbacks.beforeValidation[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidation.forEach(function(key) {
        key.call(values);
      });

      assert(values.name === 'Foo changed');
    });
  });

  /**
   * Callback states should allow a function to be used
   * and should be able to mutate state.
   */

  describe('callback as a function', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: 'string'
        },

        beforeValidation: function() {
          this.name = this.name + ' changed';
        }
      });

      person = new Person();
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidation));
      assert(typeof person._callbacks.beforeValidation[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidation.forEach(function(key) {
        key.call(values);
      });

      assert(values.name === 'Foo changed');
    });
  });

});
