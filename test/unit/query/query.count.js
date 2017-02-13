var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.count()', function() {

    var User;
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
      }, function(err, ontology) {
        if(err) { return done(err); }

        User = ontology.collections.user;

        return done();
      });
    });//</before>

    it('should return a number representing the number of things', function(done) {
      User.count({ name: 'foo'}, function(err, count) {
        if(err) { return done(err); }
        try {
          assert(typeof count === 'number');
          assert(count > 0);
        } catch (e) { return done(e); }
        return done();
      });
    });//</it>

    it('should allow a query to be built using deferreds', function(done) {
      User.count()
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
