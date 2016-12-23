var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe.skip('Collection Validator ::', function() {
  describe('.validate()', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          score: {
            type: 'string',
            validations: {
              minLength: 2,
              maxLength: 5
            }
          },
          last_name: {
            type: 'string',
            validations: {
              minLength: 1
            }
          },
          city: {
            type: 'string',
            validations: {
              maxLength: 7
            }
          },
          sex: {
            type: 'string',
            validations: {
              isIn: ['male', 'female']
            }
          }
        }
      });

      waterline.registerModel(Person);

      var datastores = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, datastores: datastores }, function(err, orm) {
        if (err) {
          return done(err);
        }
        person = orm.collections.person;
        done();
      });
    });

    it('should validate all fields with presentOnly omitted', function() {
      var errors = person._validator({ city: 'Washington' });

      assert(errors, 'expected validation errors');
      assert(!errors.first_name);
      assert(errors.last_name);
      assert(errors.city);
      assert(errors.score);
      assert(errors.sex);
      assert.equal(_.first(errors.last_name).rule, 'minLength');
      assert.equal(_.first(errors.city).rule, 'maxLength');
      assert.equal(_.first(errors.score).rule, 'minLength');
      assert.equal(_.first(errors.sex).rule, 'isIn');
    });

    it('should validate all fields with presentOnly set to false', function() {
      var errors = person._validator({ city: 'Austin' }, false);

      assert(errors, 'expected validation errors');
      assert(!errors.first_name);
      assert(errors.last_name);
      assert(errors.score);
      assert(errors.sex);
      assert.equal(_.first(errors.last_name).rule, 'minLength');
      assert.equal(_.first(errors.score).rule, 'minLength');
      assert.equal(_.first(errors.sex).rule, 'isIn');
    });

    it('should, for presentOnly === true, validate present values only, thus not need the required last_name', function() {
      var errors = person._validator({ first_name: 'foo' }, true);
      assert(!errors, 'expected no validation errors but instead got: ' + util.inspect(errors, false, null));
    });

    it('should validate only the specified value', function() {
      var firstNameErrors = person._validator({ first_name: 'foo', last_name: 32, city: 'Washington' }, 'first_name');
      assert(!firstNameErrors, 'expected no validation errors for first name');

      var lastNameErrors = person._validator({ first_name: 'foo', city: 'Washington' }, 'last_name');
      assert(lastNameErrors);
      assert(lastNameErrors.last_name);
      assert.equal(_.first(lastNameErrors.last_name).rule, 'minLength');
      assert(!lastNameErrors.city);
    });

    it('should validate only the specified values when expressed as an array', function() {
      var errors = person._validator({ first_name: 'foo', last_name: 32, city: 'Atlanta' }, ['first_name', 'city']);
      assert(!errors);

      var cityErrors = person._validator({ first_name: 'foo', last_name: 32, city: 'Washington' }, ['first_name', 'city']);
      assert(cityErrors);
      assert(!cityErrors.first_name);
      assert(!cityErrors.last_name);
      assert(cityErrors.city);
      assert.equal(_.first(cityErrors.city).rule, 'maxLength');
    });

    it('should error if invalid enum is set', function() {
      var errors = person._validator({ sex: 'other' }, true);
      assert(errors);
      assert(errors.sex);
      assert.equal(_.first(errors.sex).rule, 'isIn');
    });

    it('should NOT error if valid enum is set', function() {
      var errors = person._validator({ sex: 'male' }, true);
      assert(!errors);
    });
  });
});
