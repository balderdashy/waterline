var assert = require('assert');
var belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture');
var Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('save', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var fixture, model, updateValues;

    before(function() {
      fixture = belongsToFixture();

      fixture.findOne = function(criteria, cb) {

        if(cb) {
          if(criteria.id) return cb(null, criteria);
          return cb();
        }

        var obj = function() {
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
        assert(!err);
        done();
      });
    });

    it('should return a promise', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.name = 'foobar';

      person.save().then(function() {
        assert(updateValues.name === 'foobar');
        done();
      }).catch(function() {
        done(new Error('Promise returned an error'));
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

        person.save().then(function() {
          done("promise should be rejected, not resolved");
        })
        .catch(function(err) {
          assert(err);
          done();
        });
      });
    });

    describe('promise with object that can\'t be found', function(){
      var originalFind;

      before(function(){
        originalFind = fixture.findOne;
        fixture.update = function(criteria, values, cb) {
          return cb(null, []);
        };
        fixture.findOne = function(criteria, cb) {
          return cb(new Error('Forced Error'));
        };
      });

      after(function(){
        fixture.findOne = originalFind;
      });

      it('should reject', function(done){
        var person = new model({ id: 1, name: 'foo' });

        person.name = 'foobar';

        person.save().then(function() {
          done(new Error("promise should be rejected, not resolved"));
        })
        .catch(function(err){
          assert(err);
          done();
        });
      });
    });

  });
});
