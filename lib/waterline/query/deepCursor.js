/******************************************************
*                                                     *
*         ROOT LEVEL                                  *
*      +--------------+                               *
*      | ADAPTER EXEC |                               *
*      +------+-------+                               *
*             v                                       *
*      +--------------+                               *   
*      |  PARENTS     |                               *   
*      +--------------+   INDEX REFERENCES            *    
*      |  CHILDREENS  +-------+ BY PATH/PK            *  
*      +--------------+       |                       *
*                             |                       *
*       GET LEVEL n           v CURSOR                *          
*       PARENTS PK       +----+----+                  *
*       BY    +----------+  INDEX  |                  *      
*       PATH  |          +----+----+                  *
*             v               ^                       *
*      +------+-------+       |                       *     
*      | ADAPTER EXEC |       |                       *    
*      +------+-------+       |                       *     
*             v               |                       *     
*      +--------------+       |                       *    
*      |  PARENTS     |       |                       *    
*      +--------------|-------+                       *    
*      |  CHILDREENS  |  MERGE PARENTS IN REFERENCES  *   
*      +--------------+              AND              *
*                        INDEX CHILDREENS BY PATH/PK  *
*                                                     *
******************************************************/


var _ = require('lodash');

var DeepCursor = module.exports = function (path, data, paths) {
    this.path = path;
    this.paths = paths;
    if (data) {
        this.root = data;
        this.parents = {};
        this.deepIndex(this.root);
    }
};

DeepCursor.prototype.deepIndex = function (data) {
    //many
    if (Array.isArray(data)) {
        for (i in data) {
            for (alias in data[i]) {
                  if ((typeof data[i][alias] === "object") && !_.isDate(data[i][alias])) {
                    //to many
                    if (Array.isArray(data[i][alias])) {
                        for (j in data[i][alias]) {
                            var child = data[i][alias][j];
                            if(!_.isFunction(child)){
                              this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                            }
                        }
                    }
                    //to one
                    else {
                        var child = data[i][alias];
                        if(child){
                          this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                        }
                    }
                }
            }
        }
    }
    //one
    else {
        for (alias in data) {
            if (typeof data[alias] === "object" && !_.isDate(data[alias])) {
                //to many
                if (Array.isArray(data[alias])) {
                    for (j in data[alias]) {
                        var child = data[alias][j];
                        if(!_.isFunction(child)){
                          this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                        }
                    }
                }
                //to one
                else {
                    var child = data[alias];
                    if(child){
                      this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                    }
                }
            }
        }
    }
};

DeepCursor.prototype.index = function (alias, pk, dest) {
    var path = this.path + '.' + alias;
    if(!this.paths[path]) return;
    
    if (!this.paths[path].refs) {
        this.paths[path].refs = {};
    }
    if (!this.paths[path].refs[pk]) {
        this.paths[path].refs[pk] = [dest];
    }
    else {
        this.paths[path].refs[pk].push(dest);
    }

    //add to path parents
    if (!this.parents[path]) {
        this.parents[path] = [];
    }
    this.parents[path].push(pk);
};

DeepCursor.prototype.extend = function (pk, object) {
    this.paths[this.path].refs[pk].forEach(function (ref) {
        _.extend(ref, object);
    });
};

DeepCursor.prototype.zip = function (data) {
    var alias = this.path.substring(this.path.lastIndexOf('.')+1, this.path.length);
    var previousPath = this.path.substring(0, this.path.lastIndexOf('.'));
    var pk = this.paths[previousPath].children[alias].primaryKey;
    //many
    if (Array.isArray(data)) {
        for (i in data) {
            this.extend(data[i][pk], data[i]);
            for (alias in data[i]) {
                  if ((typeof data[i][alias] === "object") && !_.isDate(data[i][alias])) {
                    //to many
                    if (Array.isArray(data[i][alias])) {
                        for (j in data[i][alias]) {
                            var child = data[i][alias][j];
                            if(!_.isFunction(child)){
                              this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                            }
                        }
                    }
                    //to one
                    else {
                        var child = data[i][alias];
                        if(child){
                          this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                        }
                    }
                }
            }
        }
    }
    //one
    else {
        this.extend(data[pk], data);
        for (alias in data) {
            if ((typeof data[alias] === "object") && !_.isDate(data[alias])) {
                //to many
                if (Array.isArray(data[alias])) {
                    for (j in data[alias]) {
                        var child = data[alias][j];
                        if(!_.isFunction(child)){
                          this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                        }
                    }
                }
                //to one
                else {
                    var child = data[alias];
                    if(child){
                      this.index(alias, child[this.paths[this.path].children[alias].primaryKey], child);
                    }
                }
            }
        }
    }
};

DeepCursor.prototype.getParents = function () {
    return this.parents[this.path];
};

DeepCursor.prototype.getChildPath = function (path) {
    var pathCursor = new DeepCursor(path);
    pathCursor.paths = this.paths;
    pathCursor.parents = this.parents;
    pathCursor.root = this.root;
    return pathCursor;
};

DeepCursor.prototype.getRoot = function () {
    return this.root;
};

/******************************************************
 *                    CURSOR                          *
 *         +------------|-----------------+           *
 *        /  ROOT LEVEL v                  \          *
 *      +/\/ /\/ /\/####HHH/ /\/ /\/ /\/ /\+          *
 *      /-MERGED-----###c***O)               \        *
 *    +/\ \/\ \/\ \/####HHH -----------------+        *
 *    /  INDEXED     LEVEL n ZIPING PATH --->         *
 *   +/\ \/\ \/\ \/\ \/\ \/\ -------------------+     *
 *                                                    *
 ******************************************************/