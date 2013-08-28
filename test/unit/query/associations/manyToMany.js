var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('many to many association', function() {
    var User;

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
      var adapterDef = { find: function(col, criteria, cb) { return cb(null, [criteria]); }};

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

        assert(values.joins.length === 2);

        assert(values.joins[0].parent === 'user');
        assert(values.joins[0].parentKey === 'id');
        assert(values.joins[0].child === 'car_user');
        assert(values.joins[0].childKey === 'user_id');
        assert(values.joins[0].select === false);
        assert(values.joins[0].removeParentKey === false);

        assert(values.joins[1].parent === 'car_user');
        assert(values.joins[1].parentKey === 'car_id');
        assert(values.joins[1].child === 'car');
        assert(values.joins[1].childKey === 'id');
        assert(values.joins[1].select === true);
        assert(values.joins[1].removeParentKey === false);

        done();
      });
    });

  });
});
