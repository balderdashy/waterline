var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Core Type Casting', function() {

  describe('.cast() with model attributes', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          name: {
            type: 'string'
          },
          age: {
            type: 'integer'
          }
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should cast values to proper types', function() {
      var values = person._cast.run({ name: '27', age: '27' });

      assert(typeof values.name === 'string');
      assert(values.name === '27');

      assert(typeof values.age === 'number');
      assert(values.age === 27);
    });
  });

  describe('.cast() with model attributes and uppercase types', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();

      var Person = Waterline.Collection.extend({
        identity: 'person',
        attributes: {
          name: {
            type: 'STRING'
          },
          age: {
            type: 'INTEGER'
          }
        }
      });

      waterline.loadCollection(Person);
      waterline.initialize({ adapters: { }}, function(err, colls) {
        if(err) return done(err);
        person = colls.person;
        done();
      });
    });

    it('should cast values to proper types', function() {
      var values = person._cast.run({ name: '27', age: '27' });

      assert(typeof values.name === 'string');
      assert(values.name === '27');

      assert(typeof values.age === 'number');
      assert(values.age === 27);
    });
  });

});
