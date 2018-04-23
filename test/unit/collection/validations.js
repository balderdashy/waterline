var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Validator ::', function() {
  describe('.validate()', function() {
    var person;
    var car;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Model.extend({
        identity: 'person',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          age: {
            type: 'number'
          },
          sex: {
            type: 'string',
            required: true,
            validations: {
              isIn: ['male', 'female']
            }
          }
        }
      });

      var Car = Waterline.Model.extend({
        identity: 'car',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'string',
            required: true,
            validations: {
              minLength: 6
            }
          }
        }
      });

      waterline.registerModel(Person);
      waterline.registerModel(Car);

      var datastores = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: { update: function(con, query, cb) { return cb(); }, create: function(con, query, cb) { return cb(); } } }, datastores: datastores }, function(err, orm) {
        if (err) {
          return done(err);
        }
        person = orm.collections.person;
        car = orm.collections.car;
        done();
      });
    });

    it('should not return any errors when no validation rules are violated', function(done) {
      person.create({ sex: 'male' }).exec(function(err) {
        assert(!err);
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a required field is not present in a `create`', function(done) {
      person.create({}).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/required/));
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a required string field is set to empty string in a `create`', function(done) {
      person.create({ sex: '' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/required/));
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a field is set to the wrong type in a `create`', function(done) {
      person.create({ name: 'foo', age: 'bar' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/type/));
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a field fails a validation rule in a `create`', function(done) {
      person.create({ name: 'foo', sex: 'bar' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/rule/));
        return done();
      });
    });

    it('should not return an Error when a required field is not present in an `update`', function(done) {
      person.update({}, {}).exec(function(err) {
        assert(!err);
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a required string field is set to empty string in a `update`', function(done) {
      person.update({}, { sex: '' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/required/));
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a field is set to the wrong type in a `update`', function(done) {
      person.update({}, { age: 'bar' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/type/));
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a field fails a validation rule in a `update`', function(done) {
      person.update({}, { sex: 'bar' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/rule/));
        return done();
      });
    });

    it('should not return any errors when a primary key does not violate any validations.', function(done) {

      car.create({ id: 'foobarbax' }).exec(function(err) {
        assert(!err);
        return done();
      });
    });

    it('should return an Error with name `UsageError` when a primary key fails a validation rule in a `create`', function(done) {
      car.create({ id: 'foo' }).exec(function(err) {
        assert(err);
        assert.equal(err.name, 'UsageError');
        assert(err.message.match(/rule/));
        return done();
      });
    });

  });
});
