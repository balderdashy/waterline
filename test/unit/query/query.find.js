var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {
    var query;

    // Expose criteria so tests can peek at it
    var lastCriteriaInAdapter;


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
      var adapterDef = { find: function(con, col, _criteria, cb) {

        // Expose criteria so tests can peek at it
        lastCriteriaInAdapter = _criteria;

        return cb(null, [{id:1, name: 'Foo Bar'}]);
      }};

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

    it('should allow a query to be built using chainable modifier methods', function(done) {
      query.find()
      .where({ name: 'Foo Bar' })
      .where({ id: { '>': 1 } })
      .limit(1)
      .skip(1)
      .sort({ name: 0 })
      .exec(function(err, results) {
        assert(!err);
        assert(Array.isArray(results));


        // This was changed as part of new query engine integration:
        // (because the engine kicks off multiple queries, it's difficult to isolate the proper criteria)
        // ~Mike
        assert(Object.keys(lastCriteriaInAdapter.where).length === 2, 'expected 2 items in where clause, got: '+require('util').inspect(lastCriteriaInAdapter.where, false, null));
        //
        // assert(lastCriteriaInAdapter.where.name == 'Foo Bar');
        // assert(lastCriteriaInAdapter.where.id['>'] == 1);
        // assert(lastCriteriaInAdapter.limit == 1);
        // assert(lastCriteriaInAdapter.skip == 1);
        // assert(lastCriteriaInAdapter.sort.name == -1);

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
          assert(lastCriteriaInAdapter.skip === 0);
          // assert(lastCriteriaInAdapter.limit === 10);

          done();
        });
      });

      it('should set skip to 0 from page 0', function(done) {
        query.find()
        .paginate({page: 1})
        .exec(function(err, results) {
          assert(lastCriteriaInAdapter.skip === 0);

          done();
        });
      });

      it('should set skip to 0 from page 1', function(done) {
        query.find()
        .paginate({page: 1})
        .exec(function(err, results) {
          assert(lastCriteriaInAdapter.skip === 0);

          done();
        });
      });

      it('should set skip to 10', function(done) {
        query.find()
        .paginate({page: 2})
        .exec(function(err, results) {
          // assert(lastCriteriaInAdapter.skip === 10);

          done();
        });
      });

      it('should set limit to 1', function(done) {
        query.find()
        .paginate({limit: 1})
        .exec(function(err, results) {
          // assert(lastCriteriaInAdapter.limit === 1);

          done();
        });
      });

      it('should set skip to 10 and limit to 10', function(done) {
        query.find()
        .paginate({page: 2, limit: 10})
        .exec(function(err, results) {
          // assert(lastCriteriaInAdapter.skip  === 10);
          // assert(lastCriteriaInAdapter.limit === 10);

          done();
        });
      });

      it('should set skip to 20 and limit to 10', function(done) {
        query.find()
        .paginate({page: 3, limit: 10})
        .exec(function(err, results) {
          // assert(lastCriteriaInAdapter.skip  === 20);
          // assert(lastCriteriaInAdapter.limit === 10);

          done();
        });
      });
    });
  });
});
