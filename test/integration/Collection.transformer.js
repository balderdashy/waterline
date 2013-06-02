var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('with custom column name', function() {
    var User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        attributes: {
          name: {
            type: 'string',
            columnName: 'full_name'
          }
        }
      });

      new Model({ tableName: 'foo' }, function(err, collection) {
        if(err) return done(err);
        User = collection;
        done();
      });
    });

    it('should build a transformer object', function() {
      assert(User._transformer._transformations.name === 'full_name');
    });
  });

});
