var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {
  describe('belongs to association', function() {
    var Car, generatedCriteria = {};

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          uuid: {
            type: 'string',
            primaryKey: true
          },
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
          driver: {
            model: 'user'
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
        Car = colls.collections.car;
        done();
      });
    });


    it('should build a join query', function(done) {
      Car.findOne({ driver: 1 })
      .populate('driver')
      .exec(function(err, values) {
        if(err) return done(err);
        assert(generatedCriteria.joins[0].parent === 'car');
        assert(generatedCriteria.joins[0].parentKey === 'driver');
        assert(generatedCriteria.joins[0].child === 'user');
        assert(generatedCriteria.joins[0].childKey === 'uuid');
        assert(generatedCriteria.joins[0].removeParentKey === true);
        done();
      });
    });
    
    
    it('should return error if criteria is undefined', function(done) {
      Car.findOne()
      .populate('driver')
      .exec(function(err, values) {
        assert(err, 'An Error is expected');
        done();
      });
    });

  });
});
