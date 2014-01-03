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
        adapter: 'foo',
        attributes: {
          cars: {
            collection: 'car'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        adapter: 'foo',
        attributes: {
          drivers: {
            collection: 'user'
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

        assert(generatedCriteria.joins.length === 1);
        assert(generatedCriteria.joins[0].children.length === 1);

        assert(generatedCriteria.joins[0].parent === 'user');
        assert(generatedCriteria.joins[0].parentKey === 'id');
        assert(generatedCriteria.joins[0].child === 'car_user');
        assert(generatedCriteria.joins[0].childKey === 'user_id');
        assert(generatedCriteria.joins[0].select === false);
        assert(generatedCriteria.joins[0].removeParentKey === false);

        assert(generatedCriteria.joins[0].children[0].parent === 'car_user');
        assert(generatedCriteria.joins[0].children[0].parentKey === 'car_id');
        assert(generatedCriteria.joins[0].children[0].child === 'car');
        assert(generatedCriteria.joins[0].children[0].childKey === 'id');
        assert(generatedCriteria.joins[0].children[0].select === true);
        assert(generatedCriteria.joins[0].children[0].removeParentKey === false);

        done();
      });
    });

  });
});
