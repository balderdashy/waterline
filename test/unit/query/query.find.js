var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {
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

    it('should allow options to be optional', function(done) {
      query.find({}, function(err, values) {
        assert(!err);
        done();
      });
    });

    it('should return an array', function(done) {
      query.find({}, {}, function(err, values) {
        assert(Array.isArray(values));
        done();
      });
    });

    it('should return an instance of Model', function(done) {
      query.find({}, {}, function(err, values) {
        assert(typeof values[0].doSomething === 'function');
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.find()
      .where({ name: 'Foo Bar' })
      .where({ id: { '>': 1 } })
      .limit(1)
      .skip(1)
      .sort({ name: 0 })
      .exec(function(err, results) {
        assert(!err);
        assert(Array.isArray(results));

        assert(Object.keys(results[0].where).length === 2);
        assert(results[0].where.name == 'Foo Bar');
        assert(results[0].where.id['>'] == 1);
        assert(results[0].limit == 1);
        assert(results[0].skip == 1);
        assert(results[0].sort.name == -1);

        done();
      });
    });

    describe('.paginate()', function() {
      it('should skip to 0 and limit to 10 by default', function(done) {
        query.find()
        .paginate()
        .exec(function(err, results) {
          assert(!err);
          assert(Array.isArray(results));

          assert(results[0].skip === 0);
          assert(results[0].limit === 10);

          done();
        });
      });

      it('should set skip to 0 from page 0', function(done) {
        query.find()
        .paginate({page: 1})
        .exec(function(err, results) {
          assert(results[0].skip === 0);

          done();
        });
      });

      it('should set skip to 0 from page 1', function(done) {
        query.find()
        .paginate({page: 1})
        .exec(function(err, results) {
          assert(results[0].skip === 0);

          done();
        });
      });

      it('should set skip to 10', function(done) {
        query.find()
        .paginate({page: 2})
        .exec(function(err, results) {
          assert(results[0].skip === 10);

          done();
        });
      });

      it('should set limit to 1', function(done) {
        query.find()
        .paginate({limit: 1})
        .exec(function(err, results) {
          assert(results[0].limit === 1);

          done();
        });
      });

      it('should set skip to 10 and limit to 10', function(done) {
        query.find()
        .paginate({page: 2, limit: 10})
        .exec(function(err, results) {
          assert(results[0].skip  === 10);
          assert(results[0].limit === 10);

          done();
        });
      });

      it('should set skip to 20 and limit to 10', function(done) {
        query.find()
        .paginate({page: 3, limit: 10})
        .exec(function(err, results) {
          assert(results[0].skip  === 20);
          assert(results[0].limit === 10);

          done();
        });
      });
    });
  });
});
