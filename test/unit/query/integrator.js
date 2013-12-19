/**
 * Module dependencies
 */
var fixtures = {
	joins: require('../../support/fixtures/integrator/joins'),
	cache: require('../../support/fixtures/integrator/cache')
};
var integrate = require('../../../lib/waterline/query/integrator');
var assert = require('assert');
var should = require('should');






describe('integrator', function () {

	describe('with no callback', function () {

		it('should throw', function () {
			assert.throws(function () {
				integrate({}, []);
			});
		});
	});



	describe('with otherwise-invalid input', function () {

		it('should trigger cb(err)', function (done) {
			assert.doesNotThrow(function () {
				integrate('foo', 'bar', function (err, results) {
					assert(err);
					done();
				});
			});
		});
	});



	describe('with valid input', function () {

		describe(':: results',function () {

			it('should be an array', function (done) {
				assert.doesNotThrow(function () {
					integrate(fixtures.cache, fixtures.joins, function (err, results) {
						assert(!err);
						results.should.be.Array;
						done(err);
					});
				});
			});

			it('should have items which have the properties of the parent table');

			describe(':: populated aliases', function () {
				it('should exist for every alias specified in `joins` (i.e. every `populate()`)');
				it('should contain an array of objects, where each one is exactly the same as its source object in the cache');
			});
		});
	});

});
