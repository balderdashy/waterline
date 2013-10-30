var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.update()', function() {

    describe('with proper values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            age: {
              type: 'integer',
              required: true
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should change the updatedAt timestamp', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(status[0].updatedAt);
          done();
        });
      });

      it('should set values', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(status[0].name === 'foo');
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.update({}, { foo: 'bar' }, function(err, values) {
          assert(!values.foo);
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(typeof status[0].doSomething === 'function');
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.update()
        .where({})
        .set({ name: 'foo' })
        .exec(function(err, results) {
          assert(!err);
          assert(results[0].name === 'foo');
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
        var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.update({}, { name: 'foo', age: '27' }, function(err, values) {
          assert(values[0].name === 'foo');
          assert(values[0].age === 27);
          done();
        });
      });
    });

    describe('with custom columnName set', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          autoPK: false,
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            myPk: {
              type: 'integer',
              primaryKey: true,
              columnName: 'pkColumn',
              defaultsTo: 1
            }
          }
        });

        // Fixture Adapter Def
        var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [criteria]); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });


      it('should use the custom primary key when a single value is passed in', function(done) {
        query.update(1, { name: 'foo' }, function(err, values) {
          assert(!err);
          assert(values[0].where.pkColumn === 1);
          done();
        });
      });
    });

  });
});
