var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.count()', function() {
    var WLModel;

    before(function (done) {
      var orm = new Waterline();

      orm.registerModel(
        Waterline.Model.extend({
          identity: 'user',
          connection: 'foo',
          primaryKey: 'id',
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string'
            }
          }
        })
      );

      orm.initialize({
        adapters: {
          foobar: {
            count: function(datastoreName, s3q, cb) {
              return cb(undefined, 1);
            }
          }
        },
        datastores: {
          foo: {
            adapter: 'foobar'
          }
        }
      }, function(err, orm) {
        if(err) { return done(err); }

        WLModel = orm.collections.user;
        return done();
      });
    });//</before>

    it('should return a number representing the number of things', function(done) {
      WLModel.count({ name: 'foo'}, function(err, count) {
        if(err) { return done(err); }
        try {
          assert(typeof count === 'number');
          assert(count > 0);
        } catch (e) { return done(e); }
        return done();
      });
    });//</it>

    it('should allow a query to be built using deferreds', function(done) {
      WLModel.count()
      .exec(function(err, result) {
        if(err) { return done(err); }
        try {
          assert(result);
        } catch (e) { return done(e); }
        return done();
      });
    });//</it>

  });//</describe>
});//</describe>
