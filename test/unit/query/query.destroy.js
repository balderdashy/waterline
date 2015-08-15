var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {

    describe('with Auto PK', function() {
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
        var adapterDef = { destroy: function(con, col, options, cb) { return cb(null); }};

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

      it('should not delete an empty IN array', function(done) {
        query.destroy({id: []}, function(err, deleted) {
          assert(!err);
          assert(deleted.length === 0);
          done();
        });
      });
    });

    describe('with custom columnName set', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();

        // Extend for testing purposes
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { destroy: function(con, col, options, cb) { return cb(null, options); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          query = colls.collections.user;
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
