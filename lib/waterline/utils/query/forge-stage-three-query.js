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
  var s3Q = options.stageTwoQuery;
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
  s3Q.using = model.tableName;


  //   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
  //  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
  //  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
  //  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
  //  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
  //
  // For `create` queries, the values need to be run through the transformer.
  if (s3Q.method === 'create') {
    // Validate that there is a `newRecord` key on the object
    if (!_.has(s3Q, 'newRecord') || !_.isPlainObject(s3Q.newRecord)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.'
      ));
    }

    try {
      transformer.serializeValues(s3Q.newRecord);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    return s3Q;
  }


  //   ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗    ███████╗ █████╗  ██████╗██╗  ██╗
  //  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝    ██╔════╝██╔══██╗██╔════╝██║  ██║
  //  ██║     ██████╔╝█████╗  ███████║   ██║   █████╗      █████╗  ███████║██║     ███████║
  //  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝      ██╔══╝  ██╔══██║██║     ██╔══██║
  //  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗    ███████╗██║  ██║╚██████╗██║  ██║
  //   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
  //
  // For `createEach` queries, the values of each record need to be run through the transformer.
  if (s3Q.method === 'createEach') {
    // Validate that there is a `newRecord` key on the object
    if (!_.has(s3Q, 'newRecords') || !_.isArray(s3Q.newRecords)) {
      throw flaverr('E_INVALID_RECORDS', new Error(
        'Failed process the values set for the record.'
      ));
    }

    // Transform each new record.
    _.each(s3Q.newRecords, function(record) {
      try {
        transformer.serializeValues(record);
      } catch (e) {
        throw flaverr('E_INVALID_RECORD', new Error(
          'Failed process the values set for the record.\n'+
          'Details:\n'+
          e.message
        ));
      }
    });

    return s3Q;
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
  if (s3Q.method === 'update') {
    // Validate that there is a `valuesToSet` key on the object
    if (!_.has(s3Q, 'valuesToSet') || !_.isPlainObject(s3Q.valuesToSet)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.'
      ));
    }

    // Validate that there is a `criteria` key on the object
    if (!_.has(s3Q, 'criteria') || !_.isPlainObject(s3Q.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the values to set to use column names instead of attribute names.
    try {
      transformer.serializeValues(s3Q.valuesToSet);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the values set for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Transform the criteria into column names
    try {
      s3Q.criteria.where = transformer.serializeCriteria(s3Q.criteria.where);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // TODO: Probably rip this next bit out, since `sort` isn't supported
    // for update & destroy queries anyway (that's already been validated
    // in FS2Q at this point.)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Transform sort clauses into column names
    if (!_.isUndefined(s3Q.criteria.sort) && s3Q.criteria.sort.length) {
      s3Q.criteria.sort = _.map(s3Q.criteria.sort, function(sortClause) {
        var comparatorTarget = _.first(_.keys(sortClause));
        var attrName = _.first(comparatorTarget.split(/\./));
        var sortDirection = sortClause[comparatorTarget];

        var sort = {};
        var columnName = model.schema[attrName].columnName;
        sort[[columnName].concat(comparatorTarget.split(/\./).slice(1)).join('.')] = sortDirection;
        return sort;
      });
    }

    // Remove any invalid properties
    delete s3Q.criteria.omit;
    delete s3Q.criteria.select;

    return s3Q;
  }


  //  ██████╗ ███████╗███████╗████████╗██████╗  ██████╗ ██╗   ██╗
  //  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝
  //  ██║  ██║█████╗  ███████╗   ██║   ██████╔╝██║   ██║ ╚████╔╝
  //  ██║  ██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝
  //  ██████╔╝███████╗███████║   ██║   ██║  ██║╚██████╔╝   ██║
  //  ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝    ╚═╝
  //
  // For `destroy` queries, the criteria needs to be run through the transformer.
  if (s3Q.method === 'destroy') {
    // Validate that there is a `criteria` key on the object
    if (!_.has(s3Q, 'criteria') || !_.isPlainObject(s3Q.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the criteria into column names
    try {
      s3Q.criteria.where = transformer.serializeCriteria(s3Q.criteria.where);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // TODO: Probably rip this next bit out, since `sort` isn't supported
    // for update & destroy queries anyway (that's already been validated
    // in FS2Q at this point.)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Transform sort clauses into column names
    if (!_.isUndefined(s3Q.criteria.sort) && s3Q.criteria.sort.length) {
      s3Q.criteria.sort = _.map(s3Q.criteria.sort, function(sortClause) {
        var comparatorTarget = _.first(_.keys(sortClause));
        var attrName = _.first(comparatorTarget.split(/\./));
        var sortDirection = sortClause[comparatorTarget];

        var sort = {};
        var columnName = model.schema[attrName].columnName;
        sort[[columnName].concat(comparatorTarget.split(/\./).slice(1)).join('.')] = sortDirection;
        return sort;
      });
    }

    // Remove any invalid properties
    delete s3Q.criteria.omit;
    delete s3Q.criteria.select;

    return s3Q;
  }


  //  ███████╗██╗███╗   ██╗██████╗
  //  ██╔════╝██║████╗  ██║██╔══██╗
  //  █████╗  ██║██╔██╗ ██║██║  ██║
  //  ██╔══╝  ██║██║╚██╗██║██║  ██║
  //  ██║     ██║██║ ╚████║██████╔╝
  //  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═════╝
  //
  // Build join instructions and transform criteria to column names.
  if (s3Q.method === 'find' || s3Q.method === 'findOne') {
    s3Q.method = 'find';

    //  ╔╗ ╦ ╦╦╦  ╔╦╗   ┬┌─┐┬┌┐┌  ┬┌┐┌┌─┐┌┬┐┬─┐┬ ┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║   ││ │││││  ││││└─┐ │ ├┬┘│ ││   │ ││ ││││└─┐
    //  ╚═╝╚═╝╩╩═╝═╩╝  └┘└─┘┴┘└┘  ┴┘└┘└─┘ ┴ ┴└─└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
    // Build the JOIN logic for the population
    // (And also: identify attribute names of singular associations for use below when expanding `select` clause criteria)
    var joins = [];
    var singularAssocAttrNames = [];
    _.each(s3Q.populates, function(populateCriteria, populateAttribute) {
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
        var attrDefToPopulate = model.attributes[populateAttribute];
        var schemaAttribute = model.schema[populateAttribute];

        if (!attrDefToPopulate) {
          throw new Error('In ' + util.format('`.populate("%s")`', populateAttribute) + ', attempting to populate an attribute that doesn\'t exist');
        }

        // Grab the key being populated from the original model definition to check
        // if it is a has many or belongs to. If it's a belongs_to the adapter needs
        // to know that it should replace the foreign key with the associated value.
        var parentAttr = originalModels[identity].schema[populateAttribute];

        // If this is a singular association, track it for use below
        // (when processing projections in the top-level criteria)
        if (parentAttr.model) {
          singularAssocAttrNames.push(populateAttribute);
        }

        if (parentAttr.collection && schemaAttribute.columnName) {
          console.warn('Ignoring `columnName` setting for collection `' + attrDefToPopulate + '` on attribute `' + populateAttribute + '`.');
          delete schemaAttribute.columnName;
        }

        // Build the initial join object that will link this collection to either another collection
        // or to a junction table.
        var join = {
          parentCollectionIdentity: identity,
          parent: s3Q.using,
          parentAlias: s3Q.using + '__' + populateAttribute,
          // For singular associations, the populated attribute will have a schema (since it represents
          // a real column).  For plural associations, we'll use the primary key column of the parent table.
          parentKey: schemaAttribute.columnName || model.schema[modelPrimaryKey].columnName,
          childCollectionIdentity: parentAttr.referenceIdentity,
          child: parentAttr.references,
          childAlias: parentAttr.references + '__' + populateAttribute,
          childKey: parentAttr.on,
          alias: populateAttribute,
          removeParentKey: !!parentAttr.foreignKey,
          model: !!_.has(parentAttr, 'model'),
          collection: !!_.has(parentAttr, 'collection'),
          criteria: _.clone(populateCriteria)
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

        // Find the schema of the model the attribute references
        var referencedSchema = originalModels[parentAttr.referenceIdentity];
        var reference = null;

        // If linking to a junction table, the attributes shouldn't be included in the return value
        if (referencedSchema.junctionTable) {
          join.select = false;
          reference = _.find(referencedSchema.schema, function(referencedPhysicalAttr) {
            return referencedPhysicalAttr.references && referencedPhysicalAttr.columnName !== schemaAttribute.on;
          });
        }
        // If it's a through table, treat it the same way as a junction table for now
        else if (referencedSchema.throughTable && referencedSchema.throughTable[identity + '.' + populateAttribute]) {
          join.select = false;
          reference = referencedSchema.schema[referencedSchema.throughTable[identity + '.' + populateAttribute]];
        }

        // Otherwise apply any omits to the selected attributes
        else {
          if (populateCriteria.omit && _.isArray(populateCriteria.omit) && populateCriteria.omit.length) {
            _.each(populateCriteria.omit, function(omitValue) {
              _.pull(join.criteria.select, omitValue);
            });
          }
          // Remove omit from populate criteria
          delete populateCriteria.omit;
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
            criteria: _.clone(populateCriteria)
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
        s3Q.joins = s3Q.joins || [];
        s3Q.joins = s3Q.joins.concat(joins);

        // Clear out the joins
        joins = [];

      } catch (e) {
        throw new Error(
          'Encountered unexpected error while building join instructions for ' +
          util.format('`.populate("%s")`', populateAttribute) +
          '\nDetails:\n' +
          util.inspect(e, {depth:null})
        );
      }
    }); // </ .each loop >

    // Replace populates on the s3Q with joins
    delete s3Q.populates;

    // Ensure a joins array exists
    if (!_.has(s3Q, 'joins')) {
      s3Q.joins = [];
    }


    //  ╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╦╔╦╗      ┌─  ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ─┐
    //  ╚═╗║╣ ║  ║╣ ║   ║   ║ ║║║║║ ║       │   ├─┘├┬┘│ │ │├┤ │   │ ││ ││││└─┐   │
    //  ╚═╝╚═╝╩═╝╚═╝╚═╝ ╩ooo╚═╝╩ ╩╩ ╩       └─  ┴  ┴└─└─┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘  ─┘
    // If the model's hasSchema value is set to false AND it has the default `select` clause (i.e. `['*']`),
    // remove the select.
    if ((model.hasSchema === false && (_.indexOf(s3Q.criteria.select, '*') > -1)) || (s3Q.meta && s3Q.meta.skipExpandingDefaultSelectClause)) {
      delete s3Q.criteria.select;
    }

    if (s3Q.criteria.select) {

      // If an EXPLICIT `select` clause is being used, ensure that the primary key
      // of the model is included.  (This gets converted to its proper columnName below.)
      //
      // > Why do this?
      // > The primary key is always required in Waterline for further processing needs.
      if (!_.contains(s3Q.criteria.select, '*')) {

        s3Q.criteria.select.push(model.primaryKey);

      }//‡
      // Otherwise, `select: ['*']` is in use, so expand it out into column names.
      // This makes it much easier to work with in adapters, and to dynamically modify
      // the select statement to alias values as needed when working with populates.
      else {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: consider doing this in-place instead:
        // (just need to verify that it'd be safe to change re polypopulates)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        var selectedKeys = [];
        _.each(model.attributes, function(val, key) {
          if (!_.has(val, 'collection')) {
            selectedKeys.push(key);
          }
        });
        s3Q.criteria.select = selectedKeys;
      }

      // Apply any omits to the selected attributes
      if (s3Q.criteria.omit.length > 0) {
        _.each(s3Q.criteria.omit, function(omitAttrName) {
          _.pull(s3Q.criteria.select, omitAttrName);
        });
      }

      // If this query is populating any singular associations, then make sure
      // their foreign keys are included.  (Remember, we already calculated this above)
      // > We do this using attribute names because we're about to transform everything
      // > to column names anything momentarily.
      if (singularAssocAttrNames.length > 0) {
        _.each(singularAssocAttrNames, function (attrName){
          s3Q.criteria.select.push(attrName);
        });
      }

      // Just an additional check after modifying the select to make sure
      // that it only contains unique values.
      s3Q.criteria.select = _.uniq(s3Q.criteria.select);

      // Finally, transform the `select` clause into column names
      s3Q.criteria.select = _.map(s3Q.criteria.select, function(attrName) {
        return model.schema[attrName].columnName;
      });

    }//>-

    // Remove `omit` clause, since it's no longer relevant for the FS3Q.
    delete s3Q.criteria.omit;
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Keep `omit` (see https://trello.com/c/b57sDgVr/124-adapter-spec-change-to-allow-for-more-flexible-base-values)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


    //  ╔═╗╔═╗╦═╗╔╦╗
    //  ╚═╗║ ║╠╦╝ ║
    //  ╚═╝╚═╝╩╚═ ╩
    // Transform the `sort` clause into column names
    if (!_.isUndefined(s3Q.criteria.sort) && s3Q.criteria.sort.length) {
      s3Q.criteria.sort = _.map(s3Q.criteria.sort, function(sortClause) {
        var comparatorTarget = _.first(_.keys(sortClause));
        var attrName = _.first(comparatorTarget.split(/\./));
        var sortDirection = sortClause[comparatorTarget];

        var sort = {};
        var columnName = model.schema[attrName].columnName;
        sort[[columnName].concat(comparatorTarget.split(/\./).slice(1)).join('.')] = sortDirection;
        return sort;
      });
    }

    //  ╦ ╦╦ ╦╔═╗╦═╗╔═╗
    //  ║║║╠═╣║╣ ╠╦╝║╣
    //  ╚╩╝╩ ╩╚═╝╩╚═╚═╝
    // Transform the `where` clause into column names
    try {
      s3Q.criteria.where = transformer.serializeCriteria(s3Q.criteria.where);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Now, in the subcriteria `where` clause(s), if relevant:
    //
    // Transform any populate...where clauses to use the correct columnName values
    _.each(s3Q.joins, function(join) {

      var joinCollection = originalModels[join.childCollectionIdentity];

      // Ensure a join criteria exists
      join.criteria = join.criteria || {};
      join.criteria = joinCollection._transformer.serializeCriteria(join.criteria);

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO -- is this necessary?  Leaving in so that many-to-many tests pass.
      //
      // Note that this is NOT necessary as part of:
      // https://github.com/balderdashy/waterline/blob/7f58b07be54542f4e127c2dc29cf80ce2110f32a/lib/waterline/utils/query/forge-stage-two-query.js#L763-L766
      // ^^the implementation of that is in help-find now.
      //
      // That said, removing this might still break it/other things. So that needs to be double-checked.
      // Either way, it'd be good to add some clarification here.
      // ```
      // If the join's `select` is false, leave it that way and eliminate the join criteria.
      if (join.select === false) {
        delete join.criteria.select;
        return;
      }
      // ```
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      // Ensure the join select doesn't contain duplicates
      join.criteria.select = _.uniq(join.criteria.select);
      delete join.select;

    });

    // console.log('\n\n****************************\n\n\n********\nStage 3 query: ',util.inspect(s3Q,{depth:5}),'\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    return s3Q;
  }


  //   █████╗  ██████╗  ██████╗ ██████╗ ███████╗ ██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗
  //  ██╔══██╗██╔════╝ ██╔════╝ ██╔══██╗██╔════╝██╔════╝ ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
  //  ███████║██║  ███╗██║  ███╗██████╔╝█████╗  ██║  ███╗███████║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
  //  ██╔══██║██║   ██║██║   ██║██╔══██╗██╔══╝  ██║   ██║██╔══██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
  //  ██║  ██║╚██████╔╝╚██████╔╝██║  ██║███████╗╚██████╔╝██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║███████║
  //  ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
  //
  // For `avg` and `sum` queries, the criteria needs to be run through the transformer.
  if (s3Q.method === 'avg' || s3Q.method === 'sum' || s3Q.method === 'count') {
    // Validate that there is a `criteria` key on the object
    if (!_.has(s3Q, 'criteria') || !_.isPlainObject(s3Q.criteria)) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.'
      ));
    }

    // Transform the criteria into column names
    try {
      s3Q.criteria = transformer.serializeCriteria(s3Q.criteria);
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Transform the numericAttrName into a column name using a nasty hack.
    try {
      var _tmpNumericKeyNameHolder = {};
      _tmpNumericKeyNameHolder[s3Q.numericAttrName] = '';
      transformer.serializeValues(_tmpNumericKeyNameHolder);
      s3Q.numericAttrName = _.first(_.keys(_tmpNumericKeyNameHolder));
    } catch (e) {
      throw flaverr('E_INVALID_RECORD', new Error(
        'Failed process the criteria for the record.\n'+
        'Details:\n'+
        e.message
      ));
    }

    // Remove any invalid properties
    delete s3Q.criteria.omit;
    delete s3Q.criteria.select;
    delete s3Q.criteria.where.populates;

    if (s3Q.method === 'count') {
      delete s3Q.criteria.skip;
      delete s3Q.criteria.sort;
      delete s3Q.criteria.limit;
    }

    return s3Q;
  }


  // If the method wasn't recognized, throw an error
  throw flaverr('E_INVALID_QUERY', new Error(
    'Invalid query method set - `' + s3Q.method + '`.'
  ));
};
