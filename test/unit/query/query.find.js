var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.find()', function() {
    var query;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        schema: false,
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          }
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = { find: function(con, query, cb) { return cb(null, [{id: 1, criteria: query.criteria}]); }};

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if(err) {
          return done(err);
        }
        query = orm.collections.user;
        return done();
      });
    });

    it('should allow options to be optional', function(done) {
      query.find({}, function(err) {
        if(err) {
          return done(err);
        }

        return done();
      });
    });

    it('should return an array', function(done) {
      query.find({}, {}, function(err, values) {
        if (err) {
          return done(err);
        }

        assert(_.isArray(values));
        return done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.find()
      .where({ name: 'Foo Bar' })
      .where({ id: { '>': 1 } })
      .limit(1)
      .skip(1)
      .sort([{ name: 'desc' }])
      .exec(function(err, results) {
        if (err) {
          return done(err);
        }

        assert(_.isArray(results));
        assert.equal(results[0].criteria.limit, 1);
        assert.equal(results[0].criteria.skip, 1);
        assert.equal(results[0].criteria.sort[0].name, 'DESC');

        return done();
      });
    });

    describe('.paginate()', function() {
      it('should skip to 0 and limit to 30 by default', function(done) {
        query.find()
        .paginate(0)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(_.isArray(results));
          assert.equal(results[0].criteria.skip, 0);
          assert.equal(results[0].criteria.limit, 30);

          return done();
        });
      });

      it('should set skip to 0 from page 0', function(done) {
        query.find()
        .paginate(1)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.skip, 30);
          return done();
        });
      });

      it('should set skip to 0 from page 1', function(done) {
        query.find()
        .paginate(1)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.skip, 30);
          return done();
        });
      });

      it('should set skip to 30', function(done) {
        query.find()
        .paginate(2)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.skip, 60);
          return done();
        });
      });

      it('should set limit to 1', function(done) {
        query.find()
        .paginate(1, 1)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.limit, 1);
          return done();
        });
      });

      it('should set skip to 20 and limit to 10', function(done) {
        query.find()
        .paginate(2, 10)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.skip, 20);
          assert.equal(results[0].criteria.limit, 10);
          return done();
        });
      });

      it('should set skip to 30 and limit to 10', function(done) {
        query.find()
        .paginate(3, 10)
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].criteria.skip, 30);
          assert.equal(results[0].criteria.limit, 10);
          return done();
        });
      });
    });
  });
});
