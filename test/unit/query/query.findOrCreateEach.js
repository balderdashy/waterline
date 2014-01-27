var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreateEach()', function() {

    describe('with proper values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { findOrCreateEach: function(con, col, valuesList, cb) { return cb(null, valuesList); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should require an array of criteria', function(done) {
        query.findOrCreateEach({}, {}, function(err, values) {
          assert(err);
          done();
        });
      });

      it('should require an array of values', function(done) {
        query.findOrCreateEach([], {}, function(err, values) {
          assert(err);
          done();
        });
      });

      it('should require a valid set of records', function(done) {
        query.findOrCreateEach([], [{},'string'], function(err, values) {
          assert(err);
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.findOrCreateEach([], [{ foo: 'bar' }], function(err, values) {
          assert(!values[0].foo);
          done();
        });
      });

      it('should add default values to each record', function(done) {
        query.findOrCreateEach([], [{},{}], function(err, values) {
          assert(Array.isArray(values));
          assert(values[0].name === 'Foo Bar');
          assert(values[1].name === 'Foo Bar');
          done();
        });
      });

      it('should add timestamp values to each record', function(done) {
        query.findOrCreateEach([], [{},{}], function(err, values) {
          assert(values[0].createdAt);
          assert(values[0].updatedAt);
          assert(values[0].createdAt);
          assert(values[1].updatedAt);
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.findOrCreateEach([{ name: 'foo' }])
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

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: 'string',
            age: 'integer'
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { findOrCreateEach: function(con, col, valuesList, cb) { return cb(null, valuesList); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.findOrCreateEach([], [{ name: 'foo', age: '27' }], function(err, values) {
          assert(values[0].name === 'foo');
          assert(values[0].age === 27);
          done();
        });
      });
    });

  });
});
