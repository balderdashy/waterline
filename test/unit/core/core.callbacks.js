var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Core Lifecycle Callbacks', function() {

  /**
   * Automatically build an internal Callbacks object
   * that uses no-op functions.
   */

  describe('default callbacks object', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {},
        invalidState: function() {}
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });

    it('should build a callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidate));
      assert(typeof person._callbacks.beforeValidate[0] === 'function');

      assert(Array.isArray(person._callbacks.afterValidate));
      assert(typeof person._callbacks.afterValidate[0] === 'function');

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

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: 'string',

          changeState_1: function() {
            this.name = this.name + ' changed';
          },

          changeState_2: function() {
            this.name = this.name + ' again';
          }
        },

        beforeValidate: ['changeState_1', 'changeState_2']
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidate));
      assert(typeof person._callbacks.beforeValidate[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidate.forEach(function(key) {
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

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: 'string',

          changeState_1: function() {
            this.name = this.name + ' changed';
          }
        },

        beforeValidate: 'changeState_1'
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidate));
      assert(typeof person._callbacks.beforeValidate[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidate.forEach(function(key) {
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

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        connection: 'foo',
        attributes: {
          name: 'string'
        },

        beforeValidate: function() {
          this.name = this.name + ' changed';
        }
      });

      waterline.loadCollection(Person);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        person = colls.collections.person;
        done();
      });
    });

    it('should map functions to internal _callbacks object', function() {
      assert(Array.isArray(person._callbacks.beforeValidate));
      assert(typeof person._callbacks.beforeValidate[0] === 'function');
    });

    it('should mutate values', function() {
      var values = { name: 'Foo' };
      person._callbacks.beforeValidate.forEach(function(key) {
        key.call(values);
      });

      assert(values.name === 'Foo changed');
    });
  });

});
