var _ = require('lodash');

/**
 * Model.dirty([properties])
 *
 * Returns the dirty properties of the model.
 *
 * @param {Object}       context
 * @param {Object}       current
 * @param {Array|string} [properties] Property or array of properties to check. Defaults to all.
 *
 * @returns {boolean|object} false when clean, object of diff when dirty.
 *
 * @api public
 */
module.exports = function (context, current, properties) {
  var currentObject = current.toObject(),
      original      = current._originalValues,
      diffs         = {},
      isDirty;

  // Are we going to use all, or a subset of properties?
  if (properties) {
    // A subset... For dev simplicity, guarantee an array.
    if (!Array.isArray(properties)) {
      properties = [properties];
    }
  } else {
    // All properties.
    properties = Object.getOwnPropertyNames(currentObject);
  }

  properties.forEach(function (key) {
    var value = currentObject[key],
        associationDiff;

    // Key isn't set or has undefined value. So no diff.
    if (typeof value === 'undefined') {
      return;
    }

    // If the key doesn't exist at all on the original, it's a diff.
    if (typeof original[key] === 'undefined') {
      return diffs[key] = value;
    }

    // If it's an association, check the association for differences.
    if ((_.isPlainObject(value) || _.isArray(value)) && current.associations[key]) {
      associationDiff = diffAssociations(key, current, context);

      // If the association property had a diff, add it to the diff object.
      if (associationDiff) {
        diffs[key] = associationDiff;
      }
    } else if (!_.isEqual(value, original[key])) { // If none of the above was true, compare by content.
      diffs[key] = value;
    }
  });

  isDirty = !_.isEmpty(diffs);

  // The record is dirty. Add the PK if it exists. This is needed for update in assoc and harmless otherwise.
  if (isDirty && current[context.primaryKey]) {
    diffs[context.primaryKey] = current[context.primaryKey];
  }

  return isDirty ? diffs : false;
};

/**
 * Model.clean([properties])
 *
 * Set the current state of the model as "clean". Primarily useful after calling `.update()`.
 *
 * @param {Object}       proto        The model
 * @param {String|array} [properties] A specific property, or array of properties to mark as clean. Defaults to all.
 *
 * @returns {Object} the model instance.
 * @api public
 */
module.exports.clean = function (current, properties) {
  var currentObject = current.toObject();

  // If there were no properties supplied, simply renew the entire _originalValues.
  if (!properties) {
    properties = Object.getOwnPropertyNames(currentObject);
  }

  // Guarantee array for dev simplicity.
  if (!Array.isArray(properties)) {
    properties = [properties];
  }

  properties.forEach(function (property) {

    // Nothing to clean if property doesn't exist on currentObject.
    if (!currentObject[property]) {
      return;
    }

    // Regular value? Overwrite.
    if (!current.associations[property]) {
      return current._originalValues[property] = currentObject[property];
    }

    // Try calling child.clean()
    if (typeof current[property].clean === 'function') {
      return current[property].clean();
    }

    // Can't... So it must be a *2m assoc.
    if (!Array.isArray(current[property])) {
      return;
    }

    // Loop through children, and call clean.
    current[property].forEach(function (assoc) {
      typeof assoc.clean === 'function' && assoc.clean();
    });
  });

  // All done.
  return current;
};

/**
 * Diff association.
 *
 * @param {String} associationKey
 * @param {Object} parent
 * @param {Object} context
 *
 * @returns {Array|false}
 */
function diffAssociations (associationKey, parent, context) {
  var associations = parent[associationKey],
      diffs        = [];

  // Guarantee array for dev simplicity.
  if (!Array.isArray(associations)) {
    associations = [associations];
  }

  // Loop through all associations (o2o, or *2m doesn't matter.).
  associations.forEach(function (association) {
    var associationDiff;

    // If this model isn't an instance, it's a diff by default (create or add).
    if (typeof association !== 'object' || typeof association.dirty !== 'function') {
      return diffs.push(association);
    }

    // Diff the association.
    associationDiff = association.dirty();

    // If the association didn't have a diff, return.
    if (!associationDiff) {
      return;
    }

    // Push diff to stack.
    diffs.push(associationDiff);

    // If the association has a property set for PK, set it on the diffed object (needed for proper update).
    if (association[context.primaryKey]) {
      associationDiff[context.primaryKey] = association[context.primaryKey];
    }
  });

  return diffs.length ? diffs : false;
}
