var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('many to many association', function() {
    var User, generatedCriteria;

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          cars: {
            collection: 'car',
            via: 'drivers'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
          drivers: {
            collection: 'user',
            via: 'cars',
            dominant: true
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        join: function(con, col, criteria, cb) {
          generatedCriteria = criteria;
          return cb();
        },
        find: function(con, col, criteria, cb) {
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


    it('should build a join query', function(done) {
      User.findOne(1)
      .populate('cars')
      .exec(function(err, values) {
        if(err) return done(err);

        assert(generatedCriteria.joins.length === 2);

        assert(generatedCriteria.joins[0].parent === 'user');
        assert(generatedCriteria.joins[0].parentKey === 'id');
        assert(generatedCriteria.joins[0].child === 'car_drivers__user_cars');
        assert(generatedCriteria.joins[0].childKey === 'user_cars');
        assert(generatedCriteria.joins[0].select === false);
        assert(generatedCriteria.joins[0].removeParentKey === false);

        assert(generatedCriteria.joins[1].parent === 'car_drivers__user_cars');
        assert(generatedCriteria.joins[1].parentKey === 'car_drivers');
        assert(generatedCriteria.joins[1].child === 'car');
        assert(generatedCriteria.joins[1].childKey === 'id');
        assert(Array.isArray(generatedCriteria.joins[1].select));
        assert(generatedCriteria.joins[1].removeParentKey === false);

        done();
      });
    });

  });
});
