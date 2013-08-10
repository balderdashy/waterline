/**
 * Handles a One-To-Many Association at the model instance level.
 *
 * Association will add an `add` and `remove` method to a model instance
 * when an association is defined using a `collection` key.
 *
 * Example:
 *
 * attributes: {
 *   payments: {
 *     collection: 'Payment'
 *   }
 * }
 *
 */

var Association = module.exports = function(option) {
  this.addModels = [];
  this.removeModels = [];
};

Association.prototype.add = function(id) {
  this.addModels.push(id);
};

Association.prototype.remove = function(id) {
  this.removeModels.push(id);
};
