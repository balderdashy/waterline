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
        assert(values.joins[0].collection === 'car_user');
        assert(values.joins[0].pk === 'id');
        assert(values.joins[0].fk === 'user_id');

        assert(values.joins[1].parent === 'car_user');
        assert(values.joins[1].collection === 'car');
        assert(values.joins[1].pk === 'car_id');
        assert(values.joins[1].fk === 'id');
        done();
      });
    });

  });
});
