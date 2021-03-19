/**
 * A brand new example of how to initialize Waterline without Express
 * The biggest change is decoupling Waterline and Express, thus it can be used as a normal module at any place.
 */

var mysqlAdapter = require('sails-mysql');
var Waterline = require('waterline');

/*Instantiate a new instance of Waterline*/
var waterline = new Waterline();

/*Announce a empty object, and give it to module.exports to expose it*/
var models = {};
module.exports = models;


/*Give out the config object for waterline*/
var config = {
  adapters: {
    mysql: mysqlAdapter,
    default: 'mysql'
  },
  connections: {
    mysql: {
      adapter: 'mysql',
      url: 'mysql://localhost/test?user=root&password='
    }
  }
};

/*Define the collections*/
var User = Waterline.Collection.extend({
  migrate: 'alter',
  identity: 'user',
  connection: 'mysql',
  attributes: {
    first_name: 'string',
    last_name: 'string'
  }
});

/*Load collections to the waterline instance*/
waterline.loadCollection(User);

/*Initialize the Waterline instance*/
waterline.initialize(config, function (err, ontology) {
  if (err) return console.error('waterline initialize failed.', err);

  /*This is the point: fullfiling the exported object with the collections given by the async initialize method.*/
  Object.assign(models, ontology.collections);
});


/*That's all. You can import it at any module, and use the collections freely. The following is a snippet*/

/*
var express = require('express');
var router = express.Router();

//import the module we defined
var models = require('../lib/waterline');

/!* GET home page. *!/
router.get('/', function(req, res, next) {
  var user = {
    first_name: 'elvis',
    last_name: 'yang',
  };
  models.user.create(user, function(err, result) {
    if(err) res.json(err);
    else res.json(result);
  });
});

module.exports = router;
*/
