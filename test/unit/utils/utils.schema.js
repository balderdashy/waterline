var utils = require('../../../lib/waterline/utils/schema'),
    assert = require('assert');

describe('Schema utilities', function() {

  describe('`normalizeAttributes`', function() {

    describe('with shorthand attributes', function() {
      var attributes;

      before(function() {
        attributes = {
          first_name: 'STRING',
          last_name: 'STRING'
        };

        attributes = utils.normalizeAttributes(attributes);
      });

      it('should normalize attributes to objects', function() {
        assert(typeof attributes.first_name === 'object');
        assert(typeof attributes.last_name === 'object');
      });

      it('should lowercase attribute types', function() {
        assert(attributes.first_name.type === 'string');
        assert(attributes.last_name.type === 'string');
      });
    });

    describe('with object attributes', function() {
      var attributes;

      before(function() {
        attributes = {
          first_name: {
            type: 'STRING',
            required: true
          },
          last_name: {
            type: 'STRING',
            required: false
          }
        };

        attributes = utils.normalizeAttributes(attributes);
      });

      it('should normalize attributes to objects', function() {
        assert(typeof attributes.first_name === 'object');
        assert(typeof attributes.last_name === 'object');
      });

      it('should retain other properties', function() {
        assert(typeof attributes.first_name.required !== 'undefined');
        assert(typeof attributes.last_name.required !== 'undefined');
      });

      it('should lowercase attribute types', function() {
        assert(attributes.first_name.type === 'string');
        assert(attributes.last_name.type === 'string');
      });
    });
  });

  describe('`instanceMethods`', function() {
    var methods;

    before(function() {
      var attributes = {
        first_name: 'STRING',
        last_name: 'string',
        age: function() {
          return Math.floor(Math.random() + 1 * 10);
        },
        full_name: function() {
          return this.first_name + ' ' + this.last_name;
        }
      };

      methods = utils.instanceMethods(attributes);
    });

    it('should return instance methods from attributes', function() {
      assert(typeof methods.age === 'function');
      assert(typeof methods.full_name === 'function');
    });
  });

  describe('`normalizeCallbacks`', function() {

    describe('with callbacks as function', function() {
      var callbacks;

      before(function() {
        var model = {
          attributes: {
            first_name: 'STRING',
            last_name: 'string'
          },
          afterCreate: function() {},
          beforeCreate: function() {}
        };

        callbacks = utils.normalizeCallbacks(model);
      });

      it('should normalize to callback array', function() {
        assert(Array.isArray(callbacks.afterCreate));
        assert(Array.isArray(callbacks.beforeCreate));
      });
    });

    describe('with callbacks as array of functions', function() {
      var callbacks;

      before(function() {
        var model = {
          attributes: {
            first_name: 'STRING',
            last_name: 'string'
          },
          afterCreate: [
            function() {}
          ],
          beforeCreate: [
            function() {},
            function() {}
          ]
        };

        callbacks = utils.normalizeCallbacks(model);
      });

      it('should normalize to callback array', function() {
        assert(Array.isArray(callbacks.afterCreate));
        assert(Array.isArray(callbacks.beforeCreate));
      });

      it('should retain all callback functions', function() {
        assert(callbacks.afterCreate.length === 1);
        assert(callbacks.beforeCreate.length === 2);
      });
    });

    describe('with callbacks as strings', function() {
      var attributes, callbacks;

      before(function() {
        var model = {
          attributes: {
            first_name: 'STRING',
            last_name: 'string',
            increment_age: function() {
              this.age = this.age || this.age++;
            },
            lowerize_first_name: function() {
              this.first_name = this.first_name.toLowerCase();
            }
          },
          afterCreate: 'lowerize_first_name',
          beforeCreate: 'increment_age'
        };

        attributes = model.attributes;
        callbacks = utils.normalizeCallbacks(model);
      });

      it('should normalize to callback array', function() {
        assert(Array.isArray(callbacks.afterCreate));
        assert(Array.isArray(callbacks.beforeCreate));
      });

      it('should map all callback functions', function() {
        assert(callbacks.afterCreate[0] === attributes.lowerize_first_name);
        assert(callbacks.beforeCreate[0] === attributes.increment_age);
      });
    });

    describe('with callbacks as an array of strings', function() {
      var attributes, callbacks;

      before(function() {
        var model = {
          attributes: {
            first_name: 'STRING',
            last_name: 'string',
            increment_age: function() {
              this.age = this.age || this.age++;
            },
            lowerize_first_name: function() {
              this.first_name = this.first_name.toLowerCase();
            }
          },
          afterCreate: ['increment_age', 'lowerize_first_name']
        };

        attributes = model.attributes;
        callbacks = utils.normalizeCallbacks(model);
      });

      it('should normalize to callback array', function() {
        assert(Array.isArray(callbacks.afterCreate));
      });

      it('should map all callback functions', function() {
        assert(callbacks.afterCreate[0] === attributes.increment_age);
        assert(callbacks.afterCreate[1] === attributes.lowerize_first_name);
      });
    });
  });

});