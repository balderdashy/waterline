/**
 * Module dependencies
 */
var integrate = require('../../../lib/waterline/query/integrator');
var fixtures = {
	joins: require('../../support/fixtures/integrator/joins'),
	cache: require('../../support/fixtures/integrator/cache')
};
var assert = require('assert');
var should = require('should');
var _ = require('lodash');






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

		var results;

		it('should not throw', function (done){
			// console.log('!!!START!!!');
			assert.doesNotThrow(function () {
				integrate(fixtures.cache, fixtures.joins, function (err, _results) {
					assert(!err);
					results = _results;
					// console.log('!!!END!!!');
					done();
				});
			});
		});

		describe(':: results',function () {

			it('should be an array', function () {
				results.should.be.Array;
				// console.log('\n\n** RESULTS **\n', results);
			});

			// TODO: need to get a hold of actual physical schema to check this
			it('should have items which have all the properties of the parent table');

			describe(':: populated aliases', function () {
				var aliases = Object.keys(_.groupBy(fixtures.joins, 'alias'));

				it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function () {

					// Each result is an object and contains a valid alias
					_.each(results, function (result) {
						result
						.should.be.Object;
						
						_.any(aliases, function (alias) {
							return result[alias];
						})
						.should.be.true;
					});

					// Double check.
					_.each(results, function (result) {
						result.should.be.Object;

						_.each(aliases, function (alias) {
							result[alias].should.be.ok;
							result[alias].should.be.ok;
						});
					});

					// All aliases are accounted for in results
					_.all(aliases, function (alias) {
						return results.length === _.pluck(results, alias).length;
					}).should.be.true;
				});
			});
		});
	});

});
