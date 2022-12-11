var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.stream()', function() {
    var query;

    var records = [];
    for (var i = 1; i <= 100; i++) {
      records.push({
        id: i,
        name: 'user_' + i
      });
    }

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
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
      var adapterDef = {
        find: function(datastore, query, cb) {
          return cb(undefined, records.slice(query.criteria.skip, query.criteria.skip + query.criteria.limit));
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }
        query = orm.collections.user;
        return done();
      });
    });

    it('should allow streaming a single record at a time', function(done) {

      var sum = 0;
      var stream = query.stream({}).eachRecord(function(rec, next) {
        sum += rec.id;
        return next();
      }).exec(function(err) {
        if (err) {return done(err);}
        try {
          assert.equal(sum, 5050);
        } catch (e) {return done(e);}
        return done();
      });
    });

    it('should allow streaming a batch of records at a time', function(done) {

      var batch = 0;
      var stream = query.stream({}).eachBatch(function(recs, next) {
        batch += recs.length;
        return next();
      }).exec(function(err) {
        if (err) {return done(err);}
        try {
          assert.equal(batch, 100);
        } catch (e) {return done(e);}
        return done();
      });
    });

    it('should work correctly with `.skip()` and `.limit()`', function(done) {

      var sum = 0;
      var stream = query.stream({}).skip(10).limit(50).eachRecord(function(rec, next) {
        sum += rec.id;
        return next();
      }).exec(function(err) {
        if (err) {return done(err);}
        try {
          assert.equal(sum, 1775);
        } catch (e) {return done(e);}
        return done();
      });
    });

  });
});
