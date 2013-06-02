var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('with tableName as an option', function() {
    var User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        attributes: {
          name: 'string'
        }
      });

      new Model({ tableName: 'foo' }, function(err, collection) {
        if(err) return done(err);
        User = collection;
        done();
      });
    });

    it('should have _tableName set', function() {
      assert(User._tableName === 'foo');
    });
  });

  describe('with tableName as an attribute', function() {
    var User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        tableName: 'foo',
        attributes: {
          name: 'string'
        }
      });

      new Model(function(err, collection) {
        if(err) return done(err);
        User = collection;
        done();
      });
    });

    it('should have _tableName set', function() {
      assert(User._tableName === 'foo');
    });
  });

  describe('with tableName as an attribute AND option', function() {
    var User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        tableName: 'foo',
        attributes: {
          name: 'string'
        }
      });

      new Model({ tableName: 'fooBar' }, function(err, collection) {
        if(err) return done(err);
        User = collection;
        done();
      });
    });

    it('should have _tableName set to the user specified name', function() {
      assert(User._tableName === 'foo');
    });
  });

});
