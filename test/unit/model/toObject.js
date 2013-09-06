var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('toObject', function() {

    describe('belongsTo', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var model;

      before(function() {
        model = new Model(belongsToFixture(), {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should strip out the instance methods', function() {
        var person = new model({ name: 'foo' });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foo');
        assert(!obj.full_name);
      });
    });

    describe('Many To Many', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var model;

      before(function() {
        model = new Model(manyToManyFixture(), {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should strip out the association key when no options are passed', function() {
        var person = new model({ name: 'foobar' });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(!obj.bars);
        assert(!obj.foobars);
      });

      it('should keep the association key when showJoins option is passed', function() {
        var person = new model({ name: 'foobar' }, { showJoins: true });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(obj.bars);
        assert(obj.foobars);
      });

      it('should selectively keep the association keys when joins option is passed', function() {
        var person = new model({ name: 'foobar' }, { showJoins: true, joins: ['bar'] });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(obj.bars);
        assert(!obj.foobars);
      });
    });

  });
});
