var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOne()', function() {

    describe('with autoPK', function() {
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
        var adapterDef = { find: function(con, col, criteria, cb) { return cb(null, [criteria]); }};

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

      it('should return an instance of Model', function(done) {
        query.findOne({ name: 'foo' }, function(err, values) {
          assert(typeof values.doSomething === 'function');
          done();
        });
      });

      it('should allow an integer to be passed in as criteria', function(done) {
        query.findOne(1, function(err, values) {
          assert(!err);
          assert(values.where.id === 1);
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.findOne()
        .where({ name: 'Foo Bar' })
        .where({ id: { '>': 1 } })
        .exec(function(err, results) {
          assert(!err);
          assert(!Array.isArray(results));

          assert(Object.keys(results.where).length === 2);
          assert(results.where.name == 'Foo Bar');
          assert(results.where.id['>'] == 1);

          done();
        });
      });

    });

    describe('with custom PK', function() {

      describe('with no columnName set', function() {
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
                defaultsTo: 1
              }
            }
          });

          waterline.loadCollection(Model);

          // Fixture Adapter Def
          var adapterDef = { find: function(con, col, criteria, cb) { return cb(null, [criteria]); }};

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
          query.findOne(1, function(err, values) {
            assert(!err);
            assert(values.where.myPk === 1);
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
          var adapterDef = { find: function(con, col, criteria, cb) { return cb(null, [criteria]); }};

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
          query.findOne(1, function(err, values) {
            assert(!err);
            assert(values.where.pkColumn === 1);
            done();
          });
        });
      });

    });
  });
});
