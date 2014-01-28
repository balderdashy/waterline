var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {

    describe('with proper values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            first:{
              type: 'string',
              defaultsTo: 'Foo'
            },
            second: {
              type: 'string',
              defaultsTo: 'Bar'
            },
            full: {
              type: 'string',
              defaultsTo: function(self){ return self.first + " " + self.second}
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            arr: {
              type: 'array',
              defaultsTo: []
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { createEach: function(col, valuesList, cb) { return cb(null, valuesList); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });


      it('should require an array of values', function(done) {
        query.createEach({}, function(err, values) {
          assert(err);
          done();
        });
      });

      it('should require a valid set of records', function(done) {
        query.createEach([{},'string'], function(err, values) {
          assert(err);
          done();
        });
      });

      it('should add default values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].name === 'Foo Bar');
          assert(values[1].name === 'Foo Bar');
          done();
        });
      });

      it('should add default values to each record when function', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].full === 'Foo Bar');
          assert(values[1].full === 'Foo Bar');
          done();
        });
      });

      it('should clone default values for each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].arr !== values[1].arr);
          values[1].arr.push('another');
          assert(values[0].arr.length === 0);
          assert(values[1].arr.length === 1);
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.createEach([{ foo: 'bar' }], function(err, values) {
          assert(!values[0].foo);
          done();
        });
      });

      it('should add timestamp values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          assert(values[0].createdAt);
          assert(values[0].updatedAt);
          assert(values[0].createdAt);
          assert(values[1].updatedAt);
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.createEach()
        .set([{ name: 'bob' }, { name: 'foo'}])
        .exec(function(err, result) {
          assert(!err);
          assert(result);
          assert(result[0].name === 'bob');
          assert(result[1].name === 'foo');
          done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            name: 'string',
            age: 'integer'
          }
        });

        // Fixture Adapter Def
        var adapterDef = { createEach: function(col, valuesList, cb) { return cb(null, valuesList); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.createEach([{ name: 'foo', age: '27' }], function(err, values) {
          assert(values[0].name === 'foo');
          assert(values[0].age === 27);
          done();
        });
      });
    });

  });
});
