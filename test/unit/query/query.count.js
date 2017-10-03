var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.count()', function() {

    var orm;
    before(function (done) {
      Waterline.start({
        adapters: {
          'sails-foobar': {
            identity: 'sails-foobar',
            count: function(datastoreName, s3q, cb) {
              return cb(undefined, 1);
            }
          }
        },
        datastores: {
          default: {
            adapter: 'sails-foobar'
          }
        },
        models: {
          user: {
            identity: 'user',
            datastore: 'default',
            primaryKey: 'id',
            attributes: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        }
      }, function (err, _orm) {
        if (err) { return done(err); }
        orm = _orm;
        return done();
      });

    });//</before>

    after(function(done) {
      // Note that we don't bother attempting to stop the orm
      // if it doesn't even exist (i.e. because `.start()` failed).
      if (!orm) { return done(); }
      Waterline.stop(orm, done);
    });

    it('should return a number representing the number of things', function(done) {
      Waterline.getModel('user', orm)
      .count({ name: 'foo' }, function(err, count) {
        if(err) { return done(err); }
        try {
          assert(typeof count === 'number');
          assert(count > 0);
        } catch (e) { return done(e); }
        return done();
      });
    });//</it>

    it('should allow a query to be built using deferreds', function(done) {
      Waterline.getModel('user', orm)
      .count()
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
