/**
*
*         ROOT LEVEL
*      +--------------+
*      | ADAPTER EXEC |
*      +------+-------+
*             v
*      +--------------+
*      |  PARENTS     |
*      +--------------+   INDEX REFERENCES
*      |  CHILDREENS  +-------+ BY PATH/PK
*      +--------------+       |
*                             |
*       GET LEVEL n           v CURSOR
*       PARENTS PK       +----+----+
*       BY    +----------+  INDEX  |
*       PATH  |          +----+----+
*             v               ^
*      +------+-------+       |
*      | ADAPTER EXEC |       |
*      +------+-------+       |
*             v               |
*      +--------------+       |
*      |  PARENTS     |       |
*      +--------------|-------+
*      |  CHILDREENS  |  MERGE PARENTS IN REFERENCES
*      +--------------+              AND
*                        INDEX CHILDREENS BY PATH/PK
*
*/


var _ = require('lodash');

var DeepCursor = module.exports = function(path, data, paths) {
  this.path = path;
  this.paths = paths;
  if (data) {
    this.root = data;
    this.parents = {};
    this.deepIndex(this.root);
  }
};

DeepCursor.prototype.deepIndex = function(data) {
  var child;
  var alias;
  // many
  if (Array.isArray(data)) {
    for (var i in data) {
      for (alias in data[i]) {
        if ((typeof data[i][alias] === 'object') && !_.isDate(data[i][alias])) {
          // to many
          if (Array.isArray(data[i][alias])) {
            for (j in data[i][alias]) {
              child = data[i][alias][j];
              if (!_.isFunction(child)) {
                this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
              }
            }
          } else { // to one
            child = data[i][alias];
            if (child) {
              this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
            }
          }
        }
      }
    }
  } else { // one
    for (alias in data) {
      if (typeof data[alias] === 'object' && !_.isDate(data[alias])) {
        // to many
        if (Array.isArray(data[alias])) {
          for (var j in data[alias]) {
            child = data[alias][j];
            if (!_.isFunction(child)) {
              this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
            }
          }
        } else { // to one
          child = data[alias];
          if (child) {
            this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
          }
        }
      }
    }
  }
};

DeepCursor.prototype.index = function(alias, pk, dest) {
  var path = this.path + '.' + alias;
  if (!this.paths[path]) {
    return;
  }

  if (!this.paths[path].refs) {
    this.paths[path].refs = {};
  }
  if (!this.paths[path].refs[pk]) {
    this.paths[path].refs[pk] = [dest];
  } else {
    this.paths[path].refs[pk].push(dest);
  }

  // add to path parents
  if (!this.parents[path]) {
    this.parents[path] = [];
  }
  this.parents[path].push(pk);
};

DeepCursor.prototype.extend = function(pk, object) {
  this.paths[this.path].refs[pk].forEach(function(ref) {
    _.extend(ref, object);
  });
};

DeepCursor.prototype.zip = function(data) {
  var currentAlias = this.path.substring(this.path.lastIndexOf('.') + 1, this.path.length);
  var previousPath = this.path.substring(0, this.path.lastIndexOf('.'));
  var parentPk = this.paths[previousPath].children[currentAlias].primaryKey;
  var parents = data;
  if (!Array.isArray(parents)) {
    parents = [parents];
  }
  for (var parentIterator in parents) {
    var parentData = data[parentIterator];
    var parentPkVal = parentData[parentPk];
    // insert new parents' data in previous child
    this.extend(parentPkVal, parentData);
    for (var attribute in parentData) {
      // if attribute is an association then index childs
      if (this.paths[this.path].children[attribute]) {
        var childs = parentData[attribute];
        if (!Array.isArray(childs)) {
          childs = [childs];
        }
        for (var childIterator in childs) {
          var child = childs[childIterator];
          if (!_.isFunction(child)) {
            this.index(attribute, child[this.paths[this.path].children[attribute].primaryKey], child);
          }
        }
      }
    }
  }
};

DeepCursor.prototype.getParents = function() {
  return this.parents[this.path];
};

DeepCursor.prototype.getChildPath = function(path) {
  var pathCursor = new DeepCursor(path);
  pathCursor.paths = this.paths;
  pathCursor.parents = this.parents;
  pathCursor.root = this.root;
  return pathCursor;
};

DeepCursor.prototype.getRoot = function() {
  return this.root;
};

/**
 *                    CURSOR
 *         +------------|-----------------+
 *        /  ROOT LEVEL v                  \
 *       +/\/ /\/ /\/####HHH/ /\/ /\/ /\/ /\+
 *      /-MERGED-----###c***O)               \
 *     +/\ \/\ \/\ \/####HHH -----------------+
 *    /  INDEXED     LEVEL n ZIPING PATH --->
 *   +/\ \/\ \/\ \/\ \/\ \/\ -------------------+
 *
 */
