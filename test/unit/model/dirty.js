var assert            = require('chai').assert,
    _                 = require('lodash'),
    belongsToFixture  = require('../../support/fixtures/model/context.belongsTo.fixture'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model             = require('../../../lib/waterline/model');

describe('model dirty', function () {
  var fixture, model;

  before(function () {
    fixture = manyToManyFixture();
    model = new Model(fixture);
  });

  it('.dirty() works with basic values', function () {
    var testModel = new model();

    assert.deepEqual(testModel.dirty('foo'), false, 'Model is dirty initially.');
    assert.deepEqual(testModel.dirty(), false, 'Model is dirty initially.');

    testModel.foo = 'abc';
    testModel.bar = 'def';

    assert.deepEqual(testModel.dirty('foo'), {foo: 'abc'}, 'Model isn\'t as dirty as expected.');
    assert.deepEqual(testModel.dirty(), {foo: 'abc', bar: 'def'}, 'Model isn\'t as dirty as expected.');

    testModel.foo = undefined;
    testModel.bar = undefined;

    assert.deepEqual(testModel.dirty('foo'), false, 'After cleanup, model still thinks it\'s dirty.');
    assert.deepEqual(testModel.dirty(), false, 'After cleanup, model still thinks it\'s dirty.');
  });

  it('.dirty(), on simple models, sets the PK on the results if needed', function () {
    var testModel = new model({id: 1, name: 'My ID will be set upon change.'});

    assert.equal(testModel.dirty('foo'), false, 'PK model is dirty initially.');

    testModel.name = 'I will make you filthy.';
    testModel.foo = 'abc';

    assert.deepEqual(testModel.dirty('name'), {
      name: 'I will make you filthy.',
      id  : 1
    }, 'Model isn\'t as dirty as expected.');
    assert.deepEqual(testModel.dirty(), {
      name: 'I will make you filthy.',
      foo : 'abc',
      id  : 1
    }, 'Model isn\'t as dirty as expected.');
  });

  it('.dirty() works with associations', function () {
    var testModel = new model({
      name: 'Assoc time.',
      bars: [
        new model({name: 'Upon change, my PK will not be supplied.'}), // Because otherwise it'll miss the dirty method.
      ]
    }, {showJoins: true});

    assert.deepEqual(testModel.dirty('name'), false, 'Model is dirty initially.');
    assert.deepEqual(testModel.dirty('bars'), false, 'Model is dirty initially.');
    assert.deepEqual(testModel.dirty(), false, 'Model is dirty initially.');

    testModel.name = 'Bacon.. Hmmm';
    testModel.bars.push(6);
    testModel.bars[0].name = 'You changed';

    assert.deepEqual(testModel.dirty(), {name: 'Bacon.. Hmmm', bars: [{name: 'You changed'}, 6]});
    assert.deepEqual(testModel.dirty('bars'), {bars: [{name: 'You changed'}, 6]});
    assert.deepEqual(testModel.dirty('name'), {name: 'Bacon.. Hmmm'});
  });

  it('.dirty() on association models, sets the PK on the results if needed', function () {
    var testModel = new model({
      id  : 1,
      name: 'Assoc time.',
      bars: [
        new model({id: 1, name: 'Upon change, my PK will be supplied.'}),
        new model({name: 'Upon change, my PK will not be supplied.'}),
      ]
    }, {showJoins: true});

    assert.deepEqual(testModel.dirty('name'), false, 'Model is dirty initially.');
    assert.deepEqual(testModel.dirty('bars'), false, 'Model is dirty initially.');
    assert.deepEqual(testModel.dirty(), false, 'Model is dirty initially.');

    testModel.name = 'Bacon.. Hmmm';
    testModel.bars.push(6);
    testModel.bars[0].name = 'You changed';

    assert.deepEqual(testModel.dirty(), {id: 1, name: 'Bacon.. Hmmm', bars: [{id: 1, name: 'You changed'}, 6]});
    assert.deepEqual(testModel.dirty('bars'), {bars: [{id: 1, name: 'You changed'}, 6], id: 1});
    assert.deepEqual(testModel.dirty('name'), {name: 'Bacon.. Hmmm', id: 1});
  });

  it('.clean() cleans the entire model correctly', function () {
    var testModel = new model();
    testModel.foo = 'abc';
    assert.deepEqual(testModel.dirty('foo'), {foo: 'abc'}, 'Model did not detect change as dirty.');
    testModel.clean();
    assert.equal(testModel.dirty('foo'), false, 'Model is still dirty after clean.');
  });

  it('.clean() cleans specific properties correctly', function () {
    var testModel = new model();
    testModel.foo = 'abc';
    testModel.bar = 'def';
    assert.deepEqual(testModel.dirty(), {foo: 'abc', bar: 'def'}, 'Model did not detect change as dirty.');
    testModel.clean('foo');
    assert.deepEqual(testModel.dirty(), {bar: 'def'}, 'Model is not as dirty as anticipated.');
  });

  it('.clean() cleans the entire association correctly', function () {
    var testModel = new model({
      id  : 1,
      name: 'Assoc time.',
      bars: [
        new model({id: 1, name: 'Upon change, my PK will be supplied.'}),
        new model({name: 'Upon change, my PK will not be supplied.'}),
      ]
    }, {showJoins: true});

    testModel.bars[0].name = 'Oh no';

    assert.deepEqual(testModel.dirty(), {
      id  : 1,
      bars: [{id: 1, name: 'Oh no'}]
    }, 'Model did not detect change as dirty.');

    testModel.clean('bars');

    assert.deepEqual(testModel.dirty(), false, 'Model still has dirty properties.');
  });
});
