var bootstrapCollection = require('./helpers/Collection.bootstrap');
var Adapter = require('./fixtures/adapter.withHandlers.fixture');


describe('something to test', function () {

	before(function () {
		bootstrapCollection({
      adapter: Adapter
    });
	});

	it('should not throw', function (done) {
		// test here
		done();
	});

});