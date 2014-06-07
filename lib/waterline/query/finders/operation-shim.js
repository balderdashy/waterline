/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

// TODO:
// maybe extrapolate query engine into a separate module
// so we don't have to require the entire wl2 here?
var WL2 = require('waterline2');



/**
 * Shim for Waterline2
 */

module.exports = function(obj, cb) {

  // TODO:
  // maybe extrapolate query engine into a separate module
  // so we don't have to require the entire wl2 here?

  // Simulate a WL2 ORM instance
  var orm = WL2({
    compatibilityMode: true
  });

  // Will be used to keep track of the collections which are actually
  // functioning as junctions (also known as "junctioning")
  var junctionCollections = [];

  // console.log(_.pluck(_.pluck(obj.waterline.collections, '_schema'), 'schema'));
  _.each(obj.waterline.collections, function (wl1Collection, identity) {

    // Ensure `createdAt` and `updatedAt` are deep-cloned and distinct fromone another
    var attrs = _.cloneDeep(wl1Collection._attributes);
    attrs.updatedAt = _.cloneDeep(attrs.updatedAt);
    attrs.createdAt = _.cloneDeep(attrs.createdAt);

    // If this is a junction table, apprehend it- and put it off to the side;
    // identify it as the `through` relation for relevant
    // console.log(wl1Collection);
    if (wl1Collection.meta && wl1Collection.meta.junctionTable) {
      junctionCollections.push(wl1Collection);
    }

    orm.model(identity, {
      attributes: attrs,
      datastore: _.isArray(wl1Collection.connection) ? wl1Collection.connection[0] : wl1Collection.connection
    });
  });

  // Convert WL1 "connections" + "adapters" into WL2 "datastores" + "adapters"
  _.each(obj.waterline.connections, function (wl1Connection, identity) {
    orm.datastore(identity, {
      adapter: wl1Connection.config.adapter
    });
    orm.adapter(wl1Connection.config.adapter, wl1Connection._adapter);
  });

  // Refresh once here to get all of the basic models ready to go.
  orm.refresh();

  // Use waterline-schema object that was passed in to determine the identities
  // of the pre-built junctions (which will be considered models for our purposes... for now)
  var wl1schema = obj.context.waterline.schema;
  // console.log('----- WL1 SCHEMA -----');
  // console.log(util.inspect(wl1schema, false, null));

  // For each of the relations we accumulated up above, identify it as a
  // `through` model.
  _.each(junctionCollections, function (adjoiningRelation) {
    // console.log('********************junction:'+adjoiningRelation.identity+'\n',adjoiningRelation.meta);

    // Ensure `createdAt` and `updatedAt` are deep-cloned and distinct fromone another
    var attrs = _.cloneDeep(adjoiningRelation._attributes);
    attrs.updatedAt = _.cloneDeep(attrs.updatedAt);
    attrs.createdAt = _.cloneDeep(attrs.createdAt);

    var adjoiningRelationMetadata = wl1schema[adjoiningRelation.identity];
    _(adjoiningRelationMetadata.attributes).each(function (attrDef, attrName) {

      // Ignore attributes which are not foreign keys
      if (!attrDef.foreignKey) return;

      var referencedRelation = orm.model(attrDef.references);
      // console.log('From '+adjoiningRelation.identity+'.'+attrName+', looking for other relation referenced by "'+attrDef.references+'"');
      //
      // ... what if the referenced relation doesn't exist? ...
      //

      var referencedRelationWL1Schema = wl1schema[referencedRelation.identity];
      // console.log('Found: ',referencedRelationWL1Schema);

      // Find the attribute on the other relation which references this junction
      var referencedAttribute;
      _.each(referencedRelationWL1Schema.attributes, function (otherAttrDef, otherAttrName) {
        // console.log('Looking at '+referencedRelationWL1Schema.identity+' to find an attr which `references` this '+adjoiningRelation.identity+' (an ajoining relation)');
        if (otherAttrDef.references === adjoiningRelation.identity) {
          referencedAttribute = _.cloneDeep(otherAttrDef);
          referencedAttribute.name = otherAttrName;
        }
      });

      // Now look it up in the WL2 version of the attribute.
      referencedAttribute = referencedRelation.attributes[referencedAttribute.name];

      // Then flag that attribute with a `association.through.via` which
      // will be used in the `viaJunction` AR to figure out how to link all these
      // things up.
      referencedAttribute.association.through.via = attrName;
      referencedAttribute.association.through.identity = adjoiningRelation.identity;
      referencedAttribute.association.through.entity = 'model';
      // console.log('**&* Set the via on the refernced attribute to :', referencedAttribute.association.through.via);
      // console.log('**&* My attrdef ::', attrDef);

      // Now we must decorate this attribute of the adjoining relation itself
      // to use normal, userspace syntax to point at the referenced relation.
      // (i.e. the expanded form of the `model` association tag)
      attrDef.association = {
        entity: referencedRelation.entity,
        identity: referencedRelation.identity,
        plural: false
      };
    });


    // console.log('--->',adjoiningRelation);

    // TODO:
    // in the future- add these as these as junctions, not models.

    // Finally, identify the `through` relation in the ORM.
    // (this will build a couple of ARs on it automatically)
    orm.model(adjoiningRelation.identity, {
      attributes: attrs,
      datastore: _.isArray(adjoiningRelation.connection) ? adjoiningRelation.connection[0] : adjoiningRelation.connection
    });
  });

  // Now that everything's in there, give it one last shake and kick it out the door
  // (in other words, refresh it all again with the `through` relationships in place,
  // so that ARs get created on the adjoining relations.)
  orm.refresh();


  // console.log('-----------------------------\n',util.inspect(orm.models, false, null));



  // console.log('\n\n\n==============================\n\noriginal criteria *->', obj.criteria);
  // console.log(orm.adapters);
  // console.log(orm.datastore('my_foo'));
  // console.log('\n\n\n',orm.models);
  // console.log(orm.adapter('barbaz'));

  // Build WL2 criteria object
  var criteria = obj.criteria;
  criteria.from = obj.from;
  criteria.select = {'*':true};

  // Transform joins into nested select
  var joins = _.cloneDeep(obj.criteria.joins)||[];

  var firstJoin = joins.shift();
  if (firstJoin) {

    var model = orm.model(firstJoin.parent);
    criteria.select[firstJoin.alias] = {'*': true};

    var secondJoin = joins.shift();
    if (secondJoin) {

      var grandchildModel = orm.model(secondJoin.child);

      // criteria.select[secondJoin.alias] = {'*': true};
      // criteria.select[firstJoin.alias][secondJoin.parentKey] = {'*': true};
    }
  }

  // Create the query
  var query = orm.query(criteria);

  // console.log('Query:',query);

  // Run the query
  query
  .exec(function (err) {
    if (err) return cb(err);

    // Hand control back to WL1 to finish up.
    // Pass it any errors as well as the query's heap.
    var heap = query.heap;

    // console.log('finished! heap=', util.inspect(heap._models, false, null));
    cb(err, {
      preCombined: query.preCombined,
      cache: heap._models
    });
  });
  // .once('finish', function () {
  //   cb(null, {});
  // });

};
