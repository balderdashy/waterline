//  ██████╗ ██╗   ██╗██╗██╗     ██████╗     ███████╗████████╗ █████╗  ██████╗ ███████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
//  ██████╔╝██║   ██║██║██║     ██║  ██║    ███████╗   ██║   ███████║██║  ███╗█████╗
//  ██╔══██╗██║   ██║██║██║     ██║  ██║    ╚════██║   ██║   ██╔══██║██║   ██║██╔══╝
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝    ███████║   ██║   ██║  ██║╚██████╔╝███████╗
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
//
//  ██████╗      ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ╚════██╗    ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//   █████╔╝    ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//  ██╔═══╝     ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//  ███████╗    ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//  ╚══════╝     ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//
// Normalizes and validates user input to a collection (model) method such as
// `.find()`.

var _ = require('lodash');
var normalizeCriteria = require('./normalize-criteria');

module.exports = function buildStageTwoQuery(stageOneQueryObj) {
  // Build up the skeleton of the stage two query
  var stageTwoQuery = {
    method: stageOneQueryObj.method,
    using: stageOneQueryObj.using,
    meta: stageOneQueryObj.meta
  };


  //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬┌─┐
  //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  ├┬┘│ │ ├┤ ├┬┘│├─┤
  //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘┴└─┴ ┴ └─┘┴└─┴┴ ┴


  // Ensure Criteria has all the default values it needs
  if (!_.has(stageOneQueryObj, 'criteria')) {
    stageOneQueryObj.criteria = {};
  }

  // Ensure the criteria is at least on a dictionary
  if (!_.isPlainObject(stageOneQueryObj.criteria)) {
    throw new Error('Invalid Stage One query object. Criteria must be a dictionary consisting of a `where` clause.');
  }

  // Try to normalize criteria somewhat
  try {
    stageOneQueryObj.criteria = normalizeCriteria(stageOneQueryObj.criteria);
  } catch (e) {
    throw new Error('Invalid criteria clause used in ' + stageOneQueryObj.method + ' query.');
  }

  // Ensure a SELECT is set
  if (!_.has(stageOneQueryObj.criteria, 'select')) {
    stageOneQueryObj.criteria.select = ['*'];
  }

  // Ensure a WHERE clause is set
  if (!_.has(stageOneQueryObj.criteria, 'where')) {
    stageOneQueryObj.criteria.where = {};
  }

  // Ensure a LIMIT clause exists
  if (!_.has(stageOneQueryObj.criteria, 'limit')) {
    stageOneQueryObj.limit = Number.MAX_SAFE_INTEGER;
  }

  // Ensure a SKIP clause exists
  if (!_.has(stageOneQueryObj.criteria, 'skip')) {
    stageOneQueryObj.skip = 0;
  }

  // Ensure a SORT clause exists
  if (!_.has(stageOneQueryObj.criteria, 'sort')) {
    stageOneQueryObj.sort = [];
  }


  // TODO
  // Normalize the OMIT criteria


  //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐┌─┐
  //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  ├─┘│ │├─┘│ ││  ├─┤ │ ├┤ └─┐
  //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘└─┘

  if (!_.has(stageOneQueryObj, 'populates')) {
    stageOneQueryObj.populates = {};
  }

  // Ensure each populate value is fully formed
  _.each(stageOneQueryObj.populates, function(populateCriteria, populateAttributeName) {

    // Try to normalize populate criteria somewhat
    try {
      populateCriteria = normalizeCriteria(populateCriteria);
    } catch (e) {
      throw new Error('Invalid criteria clause used in ' + stageOneQueryObj.method + ' query populate clause.');
    }

    // Ensure a SELECT is set
    if (!_.has(populateCriteria, 'select')) {
      populateCriteria.select = ['*'];
    }

    // Ensure a WHERE clause is set
    if (!_.has(populateCriteria, 'where')) {
      populateCriteria.where = {};
    }

    // Ensure a LIMIT clause exists
    if (!_.has(populateCriteria, 'limit')) {
      populateCriteria.limit = Number.MAX_SAFE_INTEGER;
    }

    // Ensure a SKIP clause exists
    if (!_.has(populateCriteria, 'skip')) {
      populateCriteria.skip = 0;
    }

    // Ensure a SORT clause exists
    if (!_.has(populateCriteria, 'sort')) {
      populateCriteria.sort = [];
    }

    // Set the normalized populate values back on the populates obj
    stageOneQueryObj.populates[populateAttributeName] = populateCriteria;
  });


  // Ensure populates isn't on the criteria object any longer
  delete stageOneQueryObj.criteria.populates;

  // Set the values on the stage two query
  stageTwoQuery.criteria = stageOneQueryObj.criteria;
  stageTwoQuery.populates = stageOneQueryObj.populates;

  // Return the normalized stage two query
  return stageTwoQuery;
};
