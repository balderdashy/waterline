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

var Cursor = module.exports = function (path, subPks, data) {
    this.path = path;
    this.subPks = subPks;
    if (data) {
        this.upPks = null;
        this.root = data;
        this.refs = {};
        this.refs[this.path] = {};
        this.parents = {};
        this.deepIndex(this.root);
    }
};

Cursor.prototype.deepIndex = function (data) {
    //many
    if (Array.isArray(data)) {
        for (i in data) {
            for (alias in data[i]) {
                if (this.isAlias(data[i][alias])) {
                    //to many
                    if (Array.isArray(data[i][alias])) {
                        for (j in data[i][alias]) {
                            var child = data[i][alias][j];
                            if(!_.isFunction(child)){
                              this.index(alias, child[this.subPks[alias]], child);
                            }
                        }
                    }
                    //to one
                    else {
                        var child = data[i][alias];
                        if(child){
                          this.index(alias, child[this.subPks[alias]], child);
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
                          this.index(alias, child[this.subPks[alias]], child);
                        }
                    }
                }
                //to one
                else {
                    var child = data[alias];
                    if(child){
                      this.index(alias, child[this.subPks[alias]], child);
                    }
                }
            }
        }
    }
};

Cursor.prototype.index = function (alias, pk, dest) {
    var path = this.path + '.' + alias;
    if (!this.refs[path]) {
        this.refs[path] = {};
    }
    if (!this.refs[path][pk]) {
        this.refs[path][pk] = [dest];
    }
    else {
        this.refs[path][pk].push(dest);
    }

    //add to path parents
    if (!this.parents[path]) {
        this.parents[path] = [];
    }
    this.parents[path].push(pk);
};

Cursor.prototype.extend = function (pk, object) {
    this.refs[this.path][pk].forEach(function (ref) {
        _.extend(ref, object);
    });
};

Cursor.prototype.zip = function (data) {
    var alias = this.path.substring(this.path.lastIndexOf('.')+1, this.path.length);
    var pk = this.upPks[alias];
    //many
    if (Array.isArray(data)) {
        for (i in data) {
            this.extend(data[i][pk], data[i]);
            for (alias in data[i]) {
                if (this.isAlias(data[i][alias])) {

                    //to many
                    if (Array.isArray(data[i][alias])) {
                        for (j in data[i][alias]) {
                            var child = data[i][alias][j];
                            if(!_.isFunction(child)){
                              this.index(alias, child[this.subPks[alias]], child);
                            }
                        }
                    }
                    //to one
                    else {
                        var child = data[i][alias];
                        if(child){
                          this.index(alias, child[this.subPks[alias]], child);
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
            if (this.isAlias(data[alias])) {

                //to many
                if (Array.isArray(data[alias])) {
                    for (j in data[alias]) {
                        var child = data[alias][j];
                        if(!_.isFunction(child)){
                          this.index(alias, child[this.subPks[alias]], child);
                        }
                    }
                }
                //to one
                else {
                    var child = data[alias];
                    if(child){
                      this.index(alias, child[this.subPks[alias]], child);
                    }
                }
            }
        }
    }
};

Cursor.prototype.getParents = function () {
    return this.parents[this.path];
};

Cursor.prototype.getChildPath = function (path, subPks) {
    var path = new Cursor(path, subPks);
    path.refs = this.refs;
    path.parents = this.parents;
    path.upPks = this.subPks;
    path.root = this.root;
    return path;
};

Cursor.prototype.getRoot = function () {
    return this.root;
};
/*isAlias ensure verification  of object,if it is a populated collection or a model, it should not be a date or a function */ 
Cursor.prototype.isAlias = function(obj){
  return typeof obj === "object" && !_.isDate(obj) && !_.isFunction(obj);
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