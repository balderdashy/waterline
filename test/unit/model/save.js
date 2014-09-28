var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('save', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var fixture, model, updateValues;

    before(function() {
      fixture = belongsToFixture();

      fixture.findOne = function(criteria, cb) {
        var parentCriteria = criteria;

        if(cb) {
          if(criteria.id) return cb(null, criteria);
          return cb();
        }

        var obj = function(criteria) {
          return this;
        };

        obj.prototype.exec = function(cb) {
          cb(null, updateValues);
        };

        obj.prototype.populate = function() { return this; };

        return new obj(criteria);
      };

      fixture.update = function(criteria, values, cb) {
        updateValues = values;
        return cb(null, [new model(values)]);
      };

      model = new Model(fixture, {});
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass new values to the update function', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.name = 'foobar';

      person.save(function(err) {
        assert(updateValues.name === 'foobar');
        done();
      });
    });

    it('should return a promise', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.name = 'foobar';

      person.save().then(function(data) {
        assert(updateValues.name === 'foobar');
        assert(data);
        assert(data.name);
        assert(data.name === 'foobar');
        done();
      });
    });

    describe('promise with 0 updated rows', function(){
      var originalUpdate;
      before(function(){
        originalUpdate = fixture.update;
        fixture.update = function(criteria, values, cb) {
          return cb(null, []);
        };
      });

      after(function(){
        fixture.update = originalUpdate;
      });

      it('should reject', function(done){
        var person = new model({ id: 1, name: 'foo' });

        person.name = 'foobar';

        person.save().then(function(data) {
          assert(!data);
          done("promise should be rejected, not resolved");
        })
        .catch(function(err){
          assert(err);
          done();
        });
      })
    });

    describe('promise with object that can\'t be found', function(){
      var originalFind;
      before(function(){
        originalFind = fixture.findOne;
        fixture.findOne = function(criteria, cb) {
          var parentCriteria = criteria;

          if(cb) {
            if(criteria.id) return cb(null, criteria);
            return cb();
          }

          var obj = function(criteria) {
            return this;
          };

          obj.prototype.exec = function(cb) {
            cb("Forced error");
          };

          obj.prototype.populate = function() { return this; };

          return new obj(criteria);
        };
      });

      after(function(){
        fixture.findOne = originalFind;
      });

      it('should reject', function(done){
        var person = new model({ id: 1, name: 'foo' });

        person.name = 'foobar';

        person.save().then(function(data) {
          assert(!data);
          done("promise should be rejected, not resolved");
        })
        .catch(function(err){
          assert(err);
          done();
        });
      })
    })

  });
});
