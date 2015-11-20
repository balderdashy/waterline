var Waterline = require('../../../../lib/waterline');
var assert = require('assert');
var async = require('async');
var _ = require('lodash');

describe('Collection Query', function() {

  describe('many to many through association', function() {
    var Drive;
    var User;
    var Car;

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true
          },
          cars: {
            collection: 'car',
            through: 'drive',
            via: 'user'
          }
        }
      });

      collections.drive = Waterline.Collection.extend({
        identity: 'drive',
        connection: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true
          },
          car: {
            model: 'car'
          },
          user: {
            model: 'user'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
          id: {
            type: 'integer',
            primaryKey: true
          },
          drivers: {
            collection: 'user',
            through: 'drive',
            via: 'car',
            dominant: true
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.drive);
      waterline.loadCollection(collections.car);

      var connections = {
        'foo': {
          adapter: 'adapter'
        }
      };

      waterline.initialize({adapters: {adapter: require('sails-memory')}, connections: connections }, function(err, colls) {
        if (err) return done(err);
        User = colls.collections.user;
        Drive = colls.collections.drive;
        Car = colls.collections.car;

        async.series([
          function (callback) {
            User.create({id: 1}, callback);
          },
          function (callback) {
            Drive.create({id: 1, car: 1, user: 1}, callback);
          },
          function (callback) {
            Car.create({id: 1}, callback);
          }
        ], function(err) {
          done();
        });
      });
    });


    it('through table model associations should return a single objet', function(done) {
      Drive.findOne(1)
      .populate('car')
      .populate('user')
      .exec(function(err, drive) {
        if (err) return done(err);

        assert(!_.isArray(drive.car), 'through table model associations return Array instead of single Objet');
        assert(!_.isArray(drive.user), 'through table model associations return Array instead of single Objet');

        done();
      });
    });

  });
});
