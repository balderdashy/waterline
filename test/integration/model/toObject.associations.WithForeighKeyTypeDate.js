var Waterline = require('../../../lib/waterline');
var assert = require('assert');
var async = require('async');

describe('Collection Query', function() {

  describe('.toObject() with associations with foreign key typed as datetime', function() {
    var waterline;
    var Trucker;
    var Schedule;
    var Workday;
    var scheduleId;

    before(function(done) {
      waterline = new Waterline();
      var collections = {};

      collections.trucker = Waterline.Collection.extend({
        identity: 'Trucker',
        connection: 'foo',
        tableName: 'trucker_table',
        attributes: {
          truckerName: {
            type: 'string'
          },
          workdays: {
            collection: 'Workday',
            via: 'trucker',
            through: 'schedule'
          }
        }
      });

      collections.workday = Waterline.Collection.extend({
        identity: 'Workday',
        connection: 'foo',
        tableName: 'workday_table',
        attributes: {
          id: {
            type: 'datetime',
            primaryKey: true
          },
          start: {
            type: 'datetime',
            defaultsTo: new Date(1970, 0, 1, 12, 0)
          },
          end: {
            type: 'datetime',
            defaultsTo: new Date(1970, 0, 1, 16, 0, 0)
          },
          trucker: {
            collection: 'Trucker',
            via: 'workday',
            through: 'schedule'
          }
        }
      });

      collections.schedule = Waterline.Collection.extend({
        identity: 'Schedule',
        connection: 'foo',
        tableName: 'schedule_table',
        attributes: {
          miles: {
            type: 'integer'
          },
          trucker: {
            model: 'Trucker',
            foreignKey: true,
            columnName: 'trucker_id'
          },
          workday: {
            model: 'Workday',
            type: 'datetime',
            foreignKey: true,
            columnName: 'workday_id'
          }
        }
      });

      waterline.loadCollection(collections.trucker);
      waterline.loadCollection(collections.workday);
      waterline.loadCollection(collections.schedule);

      var connections = {
        'foo': {
          adapter: 'adapter'
        }
      };

      waterline.initialize({ adapters: { adapter: require('sails-memory') }, connections: connections }, function(err, colls) {
        if (err) { done(err); }

        Trucker = colls.collections.trucker;
        Workday = colls.collections.workday;
        Schedule = colls.collections.schedule;

        async.auto({

          createTrucker: function(next) {
            Trucker.create({ truckerName: 'trucker 1' }).exec(next);
          },

          createWorkday: function(next) {
            Workday.create({
              id: new Date(1970, 0, 1, 0, 0),
              start: new Date(1970, 0, 1, 12, 0),
              end: new Date(1970, 0, 1, 17, 0)
            }).exec(next);
          },

          createSchedule: ['createTrucker', 'createWorkday', function(next, results) {
            Schedule.create({
              trucker_id: results.createTrucker.id,
              workday_id: results.createWorkday.id,
              miles: 10
            }).exec(next);
          }]

        },

        function(err, results) {
          if (err) return done(err);
          scheduleId = results.createSchedule.id;
          done();
        });
      });
    });

    after('teardown waterline instance', function(done) {
      waterline.teardown(done);
    });

    it('should return a valid object with ids for foreign key fields', function(done) {
      Schedule.findOne({ id: scheduleId }).exec(function(err, schedule) {
        if (err) { return done(err); }
        var obj = schedule.toObject();
        assert(obj.trucker === 1);
        assert((new Date(obj.workday)).getTime() === (new Date(1970, 0, 1, 0, 0)).getTime());
        assert(obj.miles === 10);
        done();
      });
    });
  });
});
