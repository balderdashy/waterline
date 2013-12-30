var Waterline = require('../../lib/waterline'),
    adapter = require('./fixtures/adapter.withHandlers.fixture'),
    assert = require('assert'),
    should = require('should');


// Helpers
//////////////////////////////////////////////////////////////////////////////
var expect = {
  cbHasErr: function (shouldMsg) {
    it(shouldMsg || 'should provide conventional error arg to caller cb', function () {
      var err = this.resultArgs[0];
      should(err).exist;
    });
  },
  cbHasNoErr: function (shouldMsg) {
    it(shouldMsg || 'should provide NO error arg to caller cb', function () {
      var err = this.resultArgs[0];
      should(err).not.exist;
    });
  }
};
var run = {

  // Simulates a call like :: `SomeCollection.nameOfMethod( {}, cb )`
  adapterMethod: function (nameOfMethod) {
    before(function (done){
      
      var self = this;
      this.SomeCollection[nameOfMethod]( {}, function adapterFnCallback () {
        self.resultArgs = Array.prototype.slice.call(arguments);
        return done();
      });

    });
  }
};
//////////////////////////////////////////////////////////////////////////////


describe('Waterline Collection', function() {

  describe('error negotiation & handlers', function() {

    var SomeCollection;

    before(function(done) {
      var self = this;

      var Model = Waterline.Collection.extend({
        attributes: {},
        adapter: 'barbaz',
        tableName: 'tests'
      });

      var waterline = new Waterline();
      waterline.loadCollection(Model);

      waterline.initialize({ adapters: { barbaz: adapter }}, function(err, colls) {
        if(err) return done(err);
        SomeCollection = colls.tests;
        self.SomeCollection = SomeCollection;
        done();
      });
    });


    // Methods of dummy adapter do exactly what you would expect based on their names.
    // Usage signature is: `Foo.bar(options, callback)`
    it('should have the expected methods for use in our test', function () {
        SomeCollection.traditionalError.should.be.a.Function;
        SomeCollection.traditionalSuccess.should.be.a.Function;

        SomeCollection.invalid.should.be.a.Function;
        SomeCollection.anonInvalid.should.be.a.Function;

        SomeCollection.error.should.be.a.Function;
        SomeCollection.anonError.should.be.a.Function;

        SomeCollection.success.should.be.a.Function;
        SomeCollection.anonSuccess.should.be.a.Function;
    });


    describe('-> when adapter calls `cb(err)`, it', function() {
      run.adapterMethod('traditionalError');
      expect.cbHasErr();
    });

    describe('-> when adapter calls `cb(null)`, it', function() {
      run.adapterMethod('traditionalSuccess');
      expect.cbHasNoErr();
    });

    describe('-> when adapter calls `cb.error(foo)`, it', function() {
      run.adapterMethod('error');
      expect.cbHasErr();
    });

    describe('-> when adapter calls `cb.error()`, it', function() {
      run.adapterMethod('anonError');
      expect.cbHasErr();
    });

    describe('-> when adapter calls `cb.invalid(foo)`, it', function() {
      run.adapterMethod('invalid');
      expect.cbHasErr();
    });

    describe('-> when adapter calls `cb.invalid()`, it', function() {
      run.adapterMethod('anonInvalid');
      expect.cbHasErr();
    });

    describe('-> when adapter calls `cb.success(foo)`, it', function() {
      run.adapterMethod('success');
      expect.cbHasNoErr();
    });

    describe('-> when adapter calls `cb.success()`, it', function() {
      run.adapterMethod('anonSuccess');
      expect.cbHasNoErr();
    });

  });
});



