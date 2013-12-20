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


describe('leftOuterJoin', function () {

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


	describe('when run with valid input', function () {

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

		it('output should be an array', function () {
			results.should.be.Array;
		});

		it('output should match the expected results', function () {
			results.should.have.lengthOf(expected['results.length']);
		});

		describe('when run again, using previous results as left side', function () {

			var results_2;
			var expected = {
				'results_2.length': 2,
				properties: ['email', 'id', 'user_id', 'subject', 'body', 'from']
			};

			it('should not throw', function () {
				assert.doesNotThrow(function () {
					results_2 = leftOuterJoin({
						left: results,
						right: fixtures.cache.user, 
						leftKey: 'user_id',
						rightKey: 'id'
					});
				});
			});

			it('output should be an array', function () {
				results_2.should.be.Array;
			});

			it('output should match the expected results', function () {
				// console.log('\n', ':: results_2 ::\n',results_2);
				results_2.should.have.lengthOf(expected['results_2.length']);
				_.each(results_2, function (result) {
					_.each(expected.properties, function (property) {
						result.should.have.property(property);
					});
				});
			});
		});
	});


});
