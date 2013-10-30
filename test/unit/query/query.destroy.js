var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {

    describe('with Auto PK', function() {
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
        var adapterDef = { destroy: function(col, options, cb) { return cb(null); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should not return an error', function(done) {
        query.destroy({}, function(err) {
          assert(!err);
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.destroy()
        .where({})
        .exec(function(err) {
          assert(!err);
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
        var adapterDef = { destroy: function(col, options, cb) { return cb(null, options); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });


      it('should use the custom primary key when a single value is passed in', function(done) {
        query.destroy(1, function(err, values) {
          assert(!err);
          assert(values.where.pkColumn === 1);
          done();
        });
      });
    });

  });
});
