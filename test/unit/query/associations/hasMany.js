var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('has many association', function() {
    var User, generatedCriteria;

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          uuid: {
            type: 'string',
            primaryKey: true
          },
          cars: {
            collection: 'car'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        adapter: 'foo',
        attributes: {
          driver: {
            model: 'user'
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);

      // Fixture Adapter Def
      var adapterDef = { identity: 'foo', join: function(col, criteria, cb) {
        generatedCriteria = criteria;
        return cb();
      }};

      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        User = colls.user;
        done();
      });
    });


    it('should build a join query', function(done) {
      User.findOne(1)
      .populate('cars')
      .exec(function(err, values) {
        if(err) return done(err);
        assert(generatedCriteria.joins[0].parent === 'user');
        assert(generatedCriteria.joins[0].parentKey === 'uuid');
        assert(generatedCriteria.joins[0].child === 'car');
        assert(generatedCriteria.joins[0].childKey === 'driver_user_uuid');
        assert(Array.isArray(generatedCriteria.joins[0].select));
        assert(generatedCriteria.joins[0].removeParentKey === false);

        done();
      });
    });

  });
});
