/**
 * Module dependencies
 */
var leftOuterJoin = require('../../../lib/waterline/query/integrator/leftOuterJoin');
var fixtures = {
	cache: require('../../support/fixtures/integrator/cache')
};
var assert = require('assert');
var should = require('should');
var _ = require('lodash');


describe('integrator :: leftOuterJoin', function () {

	describe('with invalid input', function () {

		it('should throw if options are invalid', function () {
			assert.throws(function () {
				leftOuterJoin({
					left: 238523523952358,
					right: 'something invalid',
					leftKey: {something: 'invalid'},
					rightKey: { wtf: new Date() },
				});
			});

			assert.throws(function () {
				leftOuterJoin('something completely ridiculous');
			});
		});

		it('should throw if options are missing', function (){
			assert.throws(function () {
				leftOuterJoin({left: [], right: [], leftKey: 'foo'});
			});
			assert.throws(function () {
				leftOuterJoin({left: [], right: [], rightKey: 'foo'});
			});
			assert.throws(function () {
				leftOuterJoin({right: [], rightKey: 'foo'});
			});
		});
	});


	describe('with valid input', function () {

		var results;
		var expected = {
			'results.length': 2
		};

		it('should not throw', function () {
			assert.doesNotThrow(function () {
				results = leftOuterJoin({
					left: fixtures.cache.message,
					right: fixtures.cache.message_to_user, 
					leftKey: 'id',
					rightKey: 'message_id'
				});
			});
		});



		describe(':: results',function () {

			it('should be an array', function () {
				results.should.be.Array;
			});

			it('should contain the proper number of results', function () {
				results.should.have.lengthOf(expected['results.length']);
			});

	// 		describe(':: populated aliases', function () {
	// 			var aliases = Object.keys(_.groupBy(fixtures.joins, 'alias'));

	// 			it('should exist for every alias specified in `joins` (i.e. every `populate()`)', function () {

	// 				// Each result is an object and contains a valid alias
	// 				_.each(results, function (result) {
	// 					result
	// 					.should.be.Object;
						
	// 					_.any(aliases, function (alias) {
	// 						return result[alias];
	// 					})
	// 					.should.be.true;
	// 				});

	// 				// Double check.
	// 				_.each(results, function (result) {
	// 					result.should.be.Object;

	// 					_.each(aliases, function (alias) {
	// 						result[alias].should.be.ok;
	// 						result[alias].should.be.ok;
	// 					});
	// 				});

	// 				// All aliases are accounted for in results
	// 				_.all(aliases, function (alias) {
	// 					return results.length === _.pluck(results, alias).length;
	// 				}).should.be.true;
	// 			});
	// 		});
		});
	});

});
