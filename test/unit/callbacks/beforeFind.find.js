var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeFind()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string',
          isDeleted:'boolean'
        },

        beforeFind: function(values, cb) {
          values.isDeleted = false;
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        find: function(con, col, values, cb) { return cb(null, [values.where]);},
        findOne:function(conn,col,values,cb){return cb(null,values.where);}
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        person = colls.collections.user;
        done();
      });
    });

    // /**
    //  * find
    //  */

    describe('.find()', function() {

      it('should run beforeFind and mutate values', function(done) {

        person.find({name:'billy'}, function(err, users) {
          assert(!err);
          assert(users[0].isDeleted === false);
          done();
        });

      });
    });


    // /**
    //  * findOne
    //  */

    describe('.findOne()', function() {

      it('should run beforefind and mutate values', function(done) {

        person.findOne({name:'billy'}, function(err, user) {
          assert(!err);
          assert(user.isDeleted === false);
          done();
        });

      });
    });



  });


  /**
   * Test Callbacks can be defined as arrays and run in order.
   */

  describe('array of functions', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string'
        },

        beforeFind: [
          // Function 1
          function(values, cb) {
            values.name = values.name + ' fn1';
            cb();
          },

          // Function 2
          function(values, cb) {
            values.name = values.name + ' fn2';
            cb();
          }
        ]
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        find: function(con, col, values, cb) { return cb(null, [values.where,]);},
        findOne:function(conn,col,values,cb){return cb(null,values.where);}
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        person = colls.collections.user;
        done();
      });
    });

    it('should run the functions in order on find()', function(done) {
      person.find({ name: 'test' }, function(err, users) {
        assert(!err);
        assert(users[0].name === 'test fn1 fn2');
        done();
      });
    });
    it('should run the functions in order on findOne()', function(done) {
      person.findOne({ name: 'test' }, function(err, user) {
        assert(!err);
        assert(user.name === 'test fn1 fn2');
        done();
      });
    });

  });

});
