var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {
  describe('populated associations', function() {
    var User, generatedCriteria = {};

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          car: {
            model: 'car'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
          driver: {
            model: 'user',
            columnName: 'foobar'
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        find: function(con, col, criteria, cb) {
          if(col === 'user') return cb(null, [{ id: 1, car: 1 }]);
          if(col === 'car') return cb(null, [{ id: 1, foobar: 1 }]);
          return cb();
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        User = colls.collections.user;
        done();
      });
    });


    it('should transform populated values', function(done) {
      User.find().populate('car').exec(function(err, user) {
        if(err) return done(err);
        assert(user[0].car);
        assert(user[0].car.driver);
        assert(!user[0].car.foobar);
        done();
      });
    });

    it('should modelize populated values', function(done) {
      User.find().populate('car').exec(function(err, user) {
        if(err) return done(err);
        assert(user[0].car);
        assert(typeof user[0].car.save === 'function');
        done();
      });
    });

  });
});
