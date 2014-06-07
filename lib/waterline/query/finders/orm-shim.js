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
 * @param  {Object} obj
 * @return {ORM}
 */
module.exports = function(obj){

  // TODO:
  // maybe extrapolate query engine into a separate module
  // so we don't have to require the entire wl2 here?

  // Simulate a WL2 ORM instance
  var orm = WL2({
    compatibilityMode: true
  });

  // console.log('\n\n\n\n');
  // Will be used to keep track of the collections which are actually
  // functioning as junctions (also known as "junctioning" if you're hip and stuff)
  var junctors = [];

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
      // console.log('\n');
      // console.log('• prepared model (junctor) ->', identity);
      junctors.push(wl1Collection);
    }
    else {
      orm.model(identity, {
        attributes: attrs,
        datastore: _.isArray(wl1Collection.connection) ? wl1Collection.connection[0] : wl1Collection.connection
      });
      // console.log('\n');
      // console.log('• built model:',identity);
      // console.log(orm.model(identity));
    }
  });

  // Convert WL1 "connections" + "adapters" into WL2 "datastores" + "adapters"
  _.each(obj.waterline.connections, function (wl1Connection, identity) {
    orm.datastore(identity, {
      adapter: wl1Connection.config.adapter
    });
    orm.adapter(wl1Connection.config.adapter, wl1Connection._adapter);
  });

  // console.log('\n\n\n==============================\n\noriginal criteria *->', obj.criteria);

  // Refresh once here to get all of the basic models ready to go.
  orm.refresh();

  // console.log('\n\n\n==============================\n\nmodels *->', orm.models);

  //
  // Now we need to grab the pre-built junctions and, using waterline-schema,
  // build WL2 relations for them.
  //

  // Use waterline-schema object that was passed in to determine the identities
  // of the pre-built junctions (which will be considered models for our purposes... for now)
  var wl1schema = obj.context.waterline.schema;

  // For each of the relations we accumulated up above, identify it as a
  // `through` model.
  _.each(junctors, function eachJunctor (junctor) {

    // Ensure `createdAt` and `updatedAt` are deep-cloned and distinct fromone another
    var junctorAttrs = _.cloneDeep(junctor._attributes);
    junctorAttrs.updatedAt = _.cloneDeep(junctorAttrs.updatedAt);
    junctorAttrs.createdAt = _.cloneDeep(junctorAttrs.createdAt);

    var junctorMetadata = wl1schema[junctor.identity];
    _(junctorMetadata.attributes).each(function eachAttrInjunctor (attrDef, attrName) {

      // Ignore attributes in junctor which are not foreign keys
      if (!attrDef.foreignKey) return;

      // Lookup the main collection referenced by this attribute on the junctor
      var childRelation = orm.model(attrDef.references);

      //
      // ... what if the referenced relation doesn't exist? ...
      //

      var childRelationWL1Schema = wl1schema[childRelation.identity];
      // console.log('\n\n');
      // console.log('------******------******------******');
      // console.log('JUNCTOR (%s): ', junctorMetadata.identity, junctorMetadata);
      // console.log('CHILD (%s): ', childRelation.identity, childRelationWL1Schema);

      // Find the attribute on the child relation which references this junction
      var wl1ReferencedAttrOnChildRelation;
      _.each(childRelationWL1Schema.attributes, function eachChildAttribute (childAttrDef, childAttrName) {
        // console.log('Looking at '+childRelationWL1Schema.identity+' to find an attr which `references` this '+junctor.identity+' (an ajoining relation)');
        if (childAttrDef.references === junctor.identity) {
          wl1ReferencedAttrOnChildRelation = _.cloneDeep(childAttrDef);
          wl1ReferencedAttrOnChildRelation.name = childAttrName;
        }
      });

      // Now look up the WL2 version of the child attribute.
      var referencedAttrOnChildRelation = childRelation.attributes[wl1ReferencedAttrOnChildRelation.name];

      // Then flag that attribute on the referenced collection with
      // `association.through.via` and `association.through.onto`.
      // Determine which one is which by examining the identity of the referenced relation
      // and figuring out which of the junctor FK attributes references _it_ (this one is the `via`)
      // The other FK on the junctor is the `onto`
      if (attrDef.references === childRelation.identity) {
        referencedAttrOnChildRelation.association.through.via = attrName;
        referencedAttrOnChildRelation.association.through.onto = attrDef.via;
      }
      else {
        referencedAttrOnChildRelation.association.through.via = attrDef.via;
        referencedAttrOnChildRelation.association.through.onto = attrName;

      }

      // (All this stuff will be used in the `viaJunction` AR to figure out how
      // to link all the junctors and the main app-level relations up)

      referencedAttrOnChildRelation.association.through.identity = junctor.identity;
      referencedAttrOnChildRelation.association.through.entity = 'model';

      // console.log('set up %s (referencedAttrOnChildRelation)::', wl1ReferencedAttrOnChildRelation.name, referencedAttrOnChildRelation);
      // console.log('**&* Set the via on the refernced attribute to :', referencedAttrOnChildRelation.association.through.via);
      // console.log('**&* My attrdef ::', attrDef);

      // Now we must decorate this attribute of the adjoining relation itself
      // to use normal, userspace syntax to point at the referenced relation.
      // (i.e. the expanded form of the `model` association tag)
      junctorAttrs[attrName]= {
        fieldName: junctorAttrs[attrName].columnName,
        association: {
          entity: childRelation.entity,
          identity: childRelation.identity,
          plural: false
        }
      };
      // console.log('------******------******------******');
      // console.log('JUNCTOR (%s): ', junctor.identity, junctorAttrs);
      // console.log('------******------******------******');

    });


    // TODO:
    // in the future- add these as these as junctions, not models.

    // Finally, identify the `through` relation in the ORM.
    // (this will build a couple of ARs on it automatically)
    orm.model(junctor.identity, {
      attributes: junctorAttrs,
      datastore: _.isArray(junctor.connection) ? junctor.connection[0] : junctor.connection
    });
  });



  // Now that everything's in there, give it one last shake and kick it out the door
  // (in other words, refresh it all again with the `through` relationships in place,
  // so that ARs get created on the adjoining relations.)
  orm.refresh();


  // console.log('-----------------------------\n',util.inspect(orm.models, false, null));

  return orm;
};
