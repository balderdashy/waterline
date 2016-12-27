/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');

//  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗    ███████╗████████╗ █████╗  ██████╗ ███████╗
//  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
//  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗      ███████╗   ██║   ███████║██║  ███╗█████╗
//  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝      ╚════██║   ██║   ██╔══██║██║   ██║██╔══╝
//  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗    ███████║   ██║   ██║  ██║╚██████╔╝███████╗
//  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
//
//  ████████╗██╗  ██╗██████╗ ███████╗███████╗     ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔════╝    ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//     ██║   ███████║██████╔╝█████╗  █████╗      ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//     ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══╝      ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//     ██║   ██║  ██║██║  ██║███████╗███████╗    ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝     ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//


/**
 * forgeStageThreeQuery()
 *
 * @required {Dictionary} stageTwoQuery
 * TODO: document the rest of the options
 *
 * @return {Dictionary}         [the stage 3 query]
 */
module.exports = function forgeStageThreeQuery(options) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │ │├─┘ │ ││ ││││└─┐
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘┴   ┴ ┴└─┘┘└┘└─┘
  if (!_.has(options, 'stageTwoQuery') || !_.isPlainObject(options.stageTwoQuery)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `stageTwoQuery` option.');
  }

  if (!_.has(options, 'identity') || !_.isString(options.identity)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `identity` option.');
  }

  if (!_.has(options, 'transformer') || !_.isObject(options.transformer)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `transformer` option.');
  }

  if (!_.has(options, 'originalModels') || !_.isPlainObject(options.originalModels)) {
    throw new Error('Invalid options passed to `.buildStageThreeQuery()`. Missing or invalud `originalModels` option.');
  }


  // Store the options to prevent typing so much
  var stageTwoQuery = options.stageTwoQuery;
  var identity = options.identity;
  var transformer = options.transformer;
  var originalModels = options.originalModels;


  //  ╔═╗╦╔╗╔╔╦╗  ┌┬┐┌─┐┌┬┐┌─┐┬
  //  ╠╣ ║║║║ ║║  ││││ │ ││├┤ │
  //  ╚  ╩╝╚╝═╩╝  ┴ ┴└─┘─┴┘└─┘┴─┘
  // Grab the current model definition. It will be used in all sorts of ways.
  var model;
  try {
    model = originalModels[identity];
  } catch (e) {
    throw new Error('A model with the identity ' + identity + ' could not be found in the schema. Perhaps the wrong schema was used?');
  }


  //  ╔═╗╦╔╗╔╔╦╗  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
  //  ╠╣ ║║║║ ║║  ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
  //  ╚  ╩╝╚╝═╩╝  ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
  // Get the current model's primary key attribute
  var modelPrimaryKey = model.primaryKey;


  //  ╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╔═╗╦═╗╔╦╗  ┬ ┬┌─┐┬┌┐┌┌─┐
  //   ║ ╠╦╝╠═╣║║║╚═╗╠╣ ║ ║╠╦╝║║║  │ │└─┐│││││ ┬
  //   ╩ ╩╚═╩ ╩╝╚╝╚═╝╚  ╚═╝╩╚═╩ ╩  └─┘└─┘┴┘└┘└─┘
  stageTwoQuery.using = model.tableName;


  //   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
  //  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
  //  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
  //  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
  //  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
  //
  // For `create` queries, the values need to be run through the transformer.
  if (stageTwoQuery.method === 'create') {
    // Validate that there is a `newRecord` key on the object
    if (!_.has(stageTwoQuery, 'newRecord') || !_.isPlainObject(stageTwoQuery.newRecord)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.'
      ));
    }

    try {
      stageTwoQuery.newRecord = transformer.serialize(stageTwoQuery.newRecord);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    return stageTwoQuery;
  }


  //   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗    ███████╗ █████╗  ██████╗██╗  ██╗
  //  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝    ██╔════╝██╔══██╗██╔════╝██║  ██║
  //  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗      █████╗  ███████║██║     ███████║
  //  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝      ██╔══╝  ██╔══██║██║     ██╔══██║
  //  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗    ███████╗██║  ██║╚██████╗██║  ██║
  //   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
  //
  // For `createEach` queries, the values of each record need to be run through the transformer.
  if (stageTwoQuery.method === 'createEach') {
    // Validate that there is a `newRecord` key on the object
    if (!_.has(stageTwoQuery, 'newRecords') || !_.isArray(stageTwoQuery.newRecords)) {
      throw flaverr('E_INVALID_RECORDS', new Error(
        'Failed process the values set for the record.'
      ));
    }

    _.each(stageTwoQuery.newRecords, function(record) {
      try {
        record = transformer.serialize(record);
      } catch (e) {
        throw flaverr('E_INVALID_RECORD', new Error(
          'Failed process the values set for the record.\n'+
          'Details:\n'+
          e.message
        ));
      }
    });

    return stageTwoQuery;
  }


  //  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
  //  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗
  //  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝
  //  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
  //   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
  //
  // For `update` queries, both the values and the criteria need to be run
  // through the transformer.
  if (stageTwoQuery.method === 'update') {
    // Validate that there is a `valuesToSet` key on the object
    if (!_.has(stageTwoQuery, 'valuesToSet') || !_.isPlainObject(stageTwoQuery.valuesToSet)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.'
      ));
    }

    // Validate that there is a `criteria` key on the object
    if (!_.has(stageTwoQuery, 'criteria') || !_.isPlainObject(stageTwoQuery.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the values into column names
    try {
      stageTwoQuery.valuesToSet = transformer.serialize(stageTwoQuery.valuesToSet);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Transform the criteria into column names
    try {
      stageTwoQuery.criteria = transformer.serialize(stageTwoQuery.criteria);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Remove any invalid properties
    delete stageTwoQuery.criteria.omit;
    delete stageTwoQuery.criteria.select;

    return stageTwoQuery;
  }


  //  ██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗
  //  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝
  //  ██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝
  //  ██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝
  //  ██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║
  //  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝
  //
  // For `destroy` queries, the criteria needs to be run through the transformer.
  if (stageTwoQuery.method === 'destroy') {
    // Validate that there is a `criteria` key on the object
    if (!_.has(stageTwoQuery, 'criteria') || !_.isPlainObject(stageTwoQuery.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the criteria into column names
    try {
      stageTwoQuery.criteria = transformer.serialize(stageTwoQuery.criteria);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Remove any invalid properties
    delete stageTwoQuery.criteria.omit;
    delete stageTwoQuery.criteria.select;

    return stageTwoQuery;
  }


  //  ███████╗██╗███╗   ██╗██████╗
  //  ██╔════╝██║████╗  ██║██╔══██╗
  //  █████╗  ██║██╔██╗ ██║██║  ██║
  //  ██╔══╝  ██║██║╚██╗██║██║  ██║
  //  ██║     ██║██║ ╚████║██████╔╝
  //  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═════╝
  //
  // Build join instructions and transform criteria to column names.
  if (stageTwoQuery.method === 'find' || stageTwoQuery.method === 'findOne') {
    //  ╔╗ ╦ ╦╦╦  ╔╦╗   ┬┌─┐┬┌┐┌  ┬┌┐┌┌─┐┌┬┐┬─┐┬ ┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║   ││ │││││  ││││└─┐ │ ├┬┘│ ││   │ ││ ││││└─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └┘└─┘┴┘└┘  ┴┘└┘└─┘ ┴ ┴└─└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
    // Build the JOIN logic for the population
    var joins = [];
    _.each(stageTwoQuery.populates, function(populateCriteria, populateAttribute) {
      // If the populationCriteria is a boolean, make sure it's not a falsy value.
      if (!populateCriteria) {
        return;
      }

      if (_.isPlainObject(populateCriteria) && !_.keys(populateCriteria).length) {
        return;
      }

      // If the populate criteria is a truthy boolean, expand it out to {}
      if (_.isBoolean(populateCriteria)) {
        populateCriteria = {};
      }

      try {
        // Find the normalized schema value for the populated attribute
        var attribute = model.attributes[populateAttribute];
        var schemaAttribute = model.schema[populateAttribute];

        var attributeName = populateAttribute;
        if (!attribute) {
          throw new Error('In ' + util.format('`.populate("%s")`', populateAttribute) + ', attempting to populate an attribute that doesn\'t exist');
        }

        if (_.has(attribute, 'columnName')) {
          attributeName = attribute.columnName;
        }

        // Grab the key being populated from the original model definition to check
        // if it is a has many or belongs to. If it's a belongs_to the adapter needs
        // to know that it should replace the foreign key with the associated value.
        var parentAttr = originalModels[identity].schema[attributeName];

        // Build the initial join object that will link this collection to either another collection
        // or to a junction table.
        var join = {
          parentCollectionIdentity: identity,
          parent: stageTwoQuery.using,
          parentAlias: stageTwoQuery.using + '__' + populateAttribute,
          parentKey: schemaAttribute.columnName || modelPrimaryKey,
          childCollectionIdentity: parentAttr.referenceIdentity,
          child: parentAttr.references,
          childAlias: parentAttr.references + '__' + populateAttribute,
          childKey: parentAttr.on,
          alias: populateAttribute,
          removeParentKey: !!parentAttr.foreignKey,
          model: !!_.has(parentAttr, 'model'),
          collection: !!_.has(parentAttr, 'collection'),
          criteria: populateCriteria
        };

        // Build select object to use in the integrator
        var select = [];
        var customSelect = populateCriteria.select && _.isArray(populateCriteria.select);

        // Expand out the `*` criteria
        if (customSelect && populateCriteria.select.length === 1 && _.first(populateCriteria.select) === '*') {
          customSelect = false;
        }

        _.each(originalModels[parentAttr.referenceIdentity].schema, function(val, key) {
          // Ignore virtual attributes
          if(_.has(val, 'collection')) {
            return;
          }

          // Check if the user has defined a custom select
          if(customSelect && !_.includes(populateCriteria.select, key)) {
            return;
          }

          // Add the key to the select
          select.push(key);
        });

        // Ensure the primary key and foreign key on the child are always selected.
        // otherwise things like the integrator won't work correctly
        var childPk = originalModels[parentAttr.referenceIdentity].primaryKey;
        select.push(childPk);

        // Add the foreign key for collections so records can be turned into nested
        // objects.
        if (join.collection) {
          select.push(parentAttr.on);
        }

        // Make sure the join's select is unique
        join.criteria.select = _.uniq(select);

        // Apply any omits to the selected attributes
        if (populateCriteria.omit && _.isArray(populateCriteria.omit) && populateCriteria.omit.length) {
          _.each(populateCriteria.omit, function(omitValue) {
            _.pull(join.criteria.select, omitValue);
          });
        }

        // Remove omit from populate criteria
        delete populateCriteria.omit;

        // Find the schema of the model the attribute references
        var referencedSchema = originalModels[parentAttr.referenceIdentity];
        var reference = null;

        // If linking to a junction table, the attributes shouldn't be included in the return value
        if (referencedSchema.junctionTable) {
          join.select = false;
          reference = _.find(referencedSchema.schema, function(referencedAttribute) {
            return referencedAttribute.references && referencedAttribute.columnName !== schemaAttribute.on;
          });
        }
        // If it's a through table, treat it the same way as a junction table for now
        else if (referencedSchema.throughTable && referencedSchema.throughTable[identity + '.' + populateAttribute]) {
          join.select = false;
          reference = referencedSchema.schema[referencedSchema.throughTable[identity + '.' + populateAttribute]];
        }

        // Add the first join
        joins.push(join);

        // If a junction table is used, add an additional join to get the data
        if (reference && _.has(schemaAttribute, 'on')) {
          var selects = [];
          _.each(originalModels[reference.referenceIdentity].schema, function(val, key) {
            // Ignore virtual attributes
            if(_.has(val, 'collection')) {
              return;
            }

            // Check if the user has defined a custom select and if so normalize it
            if(customSelect && !_.includes(populateCriteria.select, key)) {
              return;
            }

            // Add the value to the select
            selects.push(key);
          });

          // Apply any omits to the selected attributes
          if (populateCriteria.omit && populateCriteria.omit.length) {
            _.each(populateCriteria.omit, function(omitValue) {
              _.pull(selects, omitValue);
            });
          }

          // Ensure the primary key and foreign are always selected. Otherwise things like the
          // integrator won't work correctly
          childPk = originalModels[reference.referenceIdentity].primaryKey;
          selects.push(childPk);

          join = {
            parentCollectionIdentity: schemaAttribute.referenceIdentity,
            parent: schemaAttribute.references,
            parentAlias: schemaAttribute.references + '__' + populateAttribute,
            parentKey: reference.columnName,
            childCollectionIdentity: reference.referenceIdentity,
            child: reference.references,
            childAlias: reference.references + '__' + populateAttribute,
            childKey: reference.on,
            alias: populateAttribute,
            junctionTable: true,
            removeParentKey: !!parentAttr.foreignKey,
            model: false,
            collection: true,
            criteria: populateCriteria
          };

          join.criteria.select = _.uniq(selects);

          joins.push(join);
        }

        // Append the criteria to the correct join if available
        if (populateCriteria && joins.length > 1) {
          joins[1].criteria = _.extend({}, joins[1].criteria);
          delete joins[0].criteria;
        } else if (populateCriteria) {
          joins[0].criteria = _.extend({}, joins[0].criteria);
        }

        // Set the criteria joins
        stageTwoQuery.joins = stageTwoQuery.joins || [];
        stageTwoQuery.joins = stageTwoQuery.joins.concat(joins);

        // Clear out the joins
        joins = [];

      } catch (e) {
        throw new Error(
          'Encountered unexpected error while building join instructions for ' +
          util.format('`.populate("%s")`', populateAttribute) +
          '\nDetails:\n' +
          util.inspect(e, false, null)
        );
      }
    }); // </ .each loop >

    // Replace populates on the stageTwoQuery with joins
    delete stageTwoQuery.populates;

    // Ensure a joins array exists
    if (!_.has(stageTwoQuery, 'joins')) {
      stageTwoQuery.joins = [];
    }


    //  ╔═╗╔═╗╔╦╗╦ ╦╔═╗  ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╚═╗║╣  ║ ║ ║╠═╝  ├─┘├┬┘│ │ │├┤ │   │ ││ ││││└─┐
    //  ╚═╝╚═╝ ╩ ╚═╝╩    ┴  ┴└─└─┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘

    // If a select clause is being used, ensure that the primary key of the model
    // is included. The primary key is always required in Waterline for further
    // processing needs.
    if (_.indexOf(stageTwoQuery.criteria.select, '*') < 0) {
      stageTwoQuery.criteria.select.push(model.primaryKey);

      // Just an additional check after modifying the select to ensure it only
      // contains unique values
      stageTwoQuery.criteria.select = _.uniq(stageTwoQuery.criteria.select);
    }

    // If no criteria is selected, expand out the SELECT statement for adapters. This
    // makes it much easier to work with and to dynamically modify the select statement
    // to alias values as needed when working with populates.
    if (_.indexOf(stageTwoQuery.criteria.select, '*') > -1) {
      var selectedKeys = [];
      _.each(model.attributes, function(val, key) {
        if (!_.has(val, 'collection')) {
          selectedKeys.push(key);
        }
      });

      stageTwoQuery.criteria.select = _.uniq(selectedKeys);
    }

    // Apply any omits to the selected attributes
    if (stageTwoQuery.criteria.omit.length) {
      _.each(stageTwoQuery.criteria.omit, function(omitValue) {
        _.pull(stageTwoQuery.criteria.select, omitValue);
      });
    }

    // Transform projections into column names
    stageTwoQuery.criteria.select = _.map(stageTwoQuery.criteria.select, function(attrName) {
      return model.schema[attrName].columnName;
    });

    // Transform Search Criteria and expand keys to use correct columnName values
    stageTwoQuery.criteria.where = transformer.serialize(stageTwoQuery.criteria.where);

    // Transform any populate where clauses to use the correct columnName values
    if (stageTwoQuery.joins.length) {
      var lastJoin = _.last(stageTwoQuery.joins);
      var joinCollection = originalModels[lastJoin.childCollectionIdentity];

      // Ensure a join criteria exists
      lastJoin.criteria = lastJoin.criteria || {};
      lastJoin.criteria = joinCollection._transformer.serialize(lastJoin.criteria);

      // Ensure the join select doesn't contain duplicates
      lastJoin.criteria.select = _.uniq(lastJoin.criteria.select);
      delete lastJoin.select;
    }

    // Remove any invalid properties
    delete stageTwoQuery.criteria.omit;

    return stageTwoQuery;
  }


  //   █████╗  ██████╗  ██████╗ ██████╗ ███████╗ ██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗
  //  ██╔══██╗██╔════╝ ██╔════╝ ██╔══██╗██╔════╝██╔════╝ ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
  //  ███████║██║  ███╗██║  ███╗██████╔╝█████╗  ██║  ███╗███████║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
  //  ██╔══██║██║   ██║██║   ██║██╔══██╗██╔══╝  ██║   ██║██╔══██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
  //  ██║  ██║╚██████╔╝╚██████╔╝██║  ██║███████╗╚██████╔╝██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║███████║
  //  ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
  //
  // For `avg` and `sum` queries, the criteria needs to be run through the transformer.
  if (stageTwoQuery.method === 'avg' || stageTwoQuery.method === 'sum' || stageTwoQuery.method === 'count') {
    // Validate that there is a `criteria` key on the object
    if (!_.has(stageTwoQuery, 'criteria') || !_.isPlainObject(stageTwoQuery.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the criteria into column names
    try {
      stageTwoQuery.criteria = transformer.serialize(stageTwoQuery.criteria);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Transform the numericAttrName into column names using a nasty hack.
    try {
      var _tmpNumbericAttr = {};
      _tmpNumbericAttr[stageTwoQuery.numericAttrName] = '';
      var processedNumericAttrName = transformer.serialize(_tmpNumbericAttr);
      stageTwoQuery.numericAttrName = _.first(_.keys(processedNumericAttrName));
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Remove any invalid properties
    delete stageTwoQuery.criteria.omit;
    delete stageTwoQuery.criteria.select;
    delete stageTwoQuery.criteria.where.populates;

    if (stageTwoQuery.method === 'count') {
      delete stageTwoQuery.criteria.skip;
      delete stageTwoQuery.criteria.sort;
      delete stageTwoQuery.criteria.limit;
    }

    return stageTwoQuery;
  }


  // If the method wasn't recognized, throw an error
  throw flaverr('E_INVALID_QUERY', new Error(
    'Invalid query method set - `' + stageTwoQuery.method + '`.'
  ));
};
