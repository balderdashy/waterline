var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.create()', function() {

    describe('with Auto values', function() {
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
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should set default values', function(done) {
        query.create({}, function(err, status) {
          assert(status.name === 'Foo Bar');
          done();
        });
      });

      it('should add timestamps', function(done) {
        query.create({}, function(err, status) {
          assert(status.createdAt);
          assert(status.updatedAt);
          done();
        });
      });

      it('should set values', function(done) {
        query.create({ name: 'Bob' }, function(err, status) {
          assert(status.name === 'Bob');
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.create({}, function(err, status) {
          assert(typeof status.doSomething === 'function');
          done();
        });
      });

    });

    describe('override auto values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',

          autoCreatedAt: false,
          autoUpdatedAt: false,

          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should NOT add timestamps', function(done) {
        query.create({}, function(err, status) {
          assert(!status.createdAt);
          assert(!status.updatedAt);
          done();
        });
      });
    });

  });
});
