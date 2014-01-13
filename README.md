![image_squidhome@2x.png](http://i.imgur.com/7rMxw.png)

# Waterline

[![Build Status](https://travis-ci.org/balderdashy/waterline.png?branch=master)](https://travis-ci.org/balderdashy/waterline) [![NPM version](https://badge.fury.io/js/waterline.png)](http://badge.fury.io/js/waterline) [![Dependency Status](https://gemnasium.com/balderdashy/waterline.png)](https://gemnasium.com/balderdashy/waterline)

Waterline is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in MySQL, LDAP, MongoDB, or Facebook.

At the same time, Waterline aims to learn lessons and maintain the best features from both Rails' ActiveRecord and Grails' Hibernate ORMs.

## Installation

Install from NPM.

```bash
$ npm install waterline
```

## Example

```javascript
var User = Waterline.Collection.extend({

  attributes: {

    firstName: {
      type: 'string',
      required: true
    },

    lastName: {
      type: 'string',
      required: true,
    }
  }
});
```

## Overview

### Using With Sails.js

Waterline was extracted from the [Sails](https://github.com/balderdashy/sails) framework and is the default ORM used in Sails. For more information on using Waterline in your Sails App view the [Sails Docs](http://sailsjs.org).

For examples of how to use with frameworks such as [Express](http://expressjs.com/) look in the [Example](https://github.com/balderdashy/waterline/tree/master/example) folder.

### Adapters Concept

Waterline uses the concept of an Adapter to translate a predefined set of methods into a query that can be understood by your data store. Adapters allow you to use various datastores such as MySQL, PostgreSQL, MongoDB, Redis, etc. and have a clear API for working with your model data.

It also allows an adapter to define it's own methods that don't necessarily fit into the CRUD methods defined by default in Waterline. If an adapter defines a custom method, Waterline will simply pass the function arguments down to the adapter.

**NOTE:** When using custom adapter methods the features of Waterline are not used. You no longer get the Lifecycle Callbacks and Validations as you would when using a defined Waterline method.

You may also supply an array of adapters and Waterline will map out the methods so they are both mixed in. It works similar to Underscore's [Extend](http://underscorejs.org/#extend) method where the last item in the array will override any methods in adapters before it. This allows you to mixin bothe traditional CRUD adapters such as MySQL with specialized adapters such as Twilio and have both types of methods available.

#### Community Adapters

  - [PostgreSQL](https://github.com/particlebanana/sails-postgresql) - *0.9+ compatible*
  - [MySQL](https://github.com/balderdashy/sails-mysql) - *0.9+ compatible*
  - [MongoDB](https://github.com/balderdashy/sails-mongo) - *0.9+ compatible*
  - [Memory](https://github.com/balderdashy/sails-memory) - *0.9+ compatible*
  - [Disk](https://github.com/balderdashy/sails-disk) - *0.9+ compatible*
  - [Redis](https://github.com/balderdashy/sails-redis)
  - [Riak](https://github.com/balderdashy/sails-riak)
  - [IRC](https://github.com/balderdashy/sails-irc)
  - [Twitter](https://github.com/balderdashy/sails-twitter)
  - [JSDom](https://github.com/mikermcneil/sails-jsdom)

## Collection

A [Collection](https://github.com/balderdashy/waterline/blob/master/lib/waterline/collection/index.js) is the main object used in Waterline. It defines the layout/schema of your data along with any validations and instance methods you create.

To create a new collection you extend `Waterline.Collection` and add in any properties you need.

#### options

Available options are

  - `tableName` Define a custom table name to store the models
  - `adapter` the name of the adapter you would like to use for this collection
  - `schema`  Set schema true/false to only allow fields defined in `attributes` to be saved. Only for schemaless adapters.
  - `attributes` A hash of attributes to be defined for a model
  - `autoCreatedAt` and `autoUpdateddAt` Set false to prevent creating `createdAt` and `updatedAt` properties in your model
  - `autoPK` Set false to prevent creating `id`. By default `id` will be created as index with auto increment
  - [lifecyle callbacks](#lifecycle-callbacks)
  - anyother class method you define!

#### Attributes

The following attribute types are currently available:

  - string
  - text
  - integer
  - float
  - date
  - time
  - datetime
  - boolean
  - binary
  - array
  - json

#### Example Collection

```javascript
var User = Waterline.Collection.extend({

  // Define a custom table name
  tableName: 'user',

  // Set schema true/false for adapters that support schemaless
  schema: true,

  // Define an adapter to use
  adapter: 'postgresql',

  // Define attributes for this collection
  attributes: {

    firstName: {
      type: 'string',

      // also accepts any validations
      required: true
    },

    lastName: {
      type: 'string',
      required: true,
      maxLength: 20
    },

    email: {

      // Special types are allowed, they are used in validations and
      // set as a string when passed to an adapter
      type: 'email',

      required: true
    },

    age: {
      type: 'integer',
      min: 18
    },

    // You can also define instance methods here
    fullName: function() {
      return this.firstName + ' ' + this.lastName
    }
  },

  /**
   * Lifecycle Callbacks
   *
   * Run before and after various stages:
   *
   * beforeValidation
   * afterValidation
   * beforeUpdate
   * afterUpdate
   * beforeCreate
   * afterCreate
   * beforeDestroy
   * afterDestroy
   */

  beforeCreate: function(values, cb) {

    // an example encrypt function defined somewhere
    encrypt(values.password, function(err, password) {
      if(err) return cb(err);

      values.password = password;
      cb();
    });
  },

  // Class Method
  doSomething: function() {
    // do something here
  }

});
```

Now that a collection is defined we can instantiate it and begin executing queries against it. All Collections take `options` and `callback` arguments.

Options will be made up of:

  - `tableName`, used if not defined in a Collection definition
  - `adapters` object that specifies each adapter, either custom definitions or from NPM

```javascript
var postgres = require('sails-postgresql');

new User({ tableName: 'foobar', adapters: { postgresql: postgres }}, function(err, Model) {

  // We now have an instantiated collection to execute queries against
  Model.find()
  .where({ age: 21 })
  .limit(10)
  .exec(function(err, users) {
    // Now we have an array of users
  });

});
```

## Model

Each result that gets returned from a Waterline query will be an instance of [Model](https://github.com/balderdashy/waterline/blob/master/lib/waterline/model/index.js). This will add in any instance methods defined in your collection along with some CRUD helper methods. View the [Core Instance Methods](https://github.com/balderdashy/waterline/blob/master/lib/waterline/model/index.js) to see how they are implemented.

Default CRUD instance methods:

  - save
  - destroy
  - toObject
  - toJSON

If you would like to filter records and remove certain attributes you can override the `toJSON` method like so:

```javascript
var user = Waterline.Collection.extend({

  attributes: {
    name: 'string',
    password: 'string',

    // Override toJSON instance method
    toJSON: function() {
      var obj = this.toObject();
      delete obj.password;
      return obj;
    }
  }
});

// Then on an instantiated user:
user.find({ id: 1}).exec(function(err, model) {
  return model.toJSON(); // will return only the name
});
```

## Query Methods

Queries can be run with either a callback interface or with a deferred object. For building complicated queries the deferred object method is the best choice. For convenience, promises are supported by default.

**Callback Method**

```javascript
User.findOne({ id: 1 }, function(err, user) {
  // Do stuff here
});
```

**Deferred Object Method**

```javascript
User.find()
.where({ id: { '>': 100 }})
.where({ age: 21 })
.limit(100)
.sort('name')
.exec(function(err, users) {
  // Do stuff here
});
```

**Promises**

```javascript
User.findOne()
.where({ id: 2 })
.then(function(user){
    var comments = Comment.find({userId: user.id}).then(function(comments){
        return comments;
    });
    return [user.id, user.friendsList, comments];
}).spread(function(userId, friendsList, comments){
    // Promises are awesome!
}).fail(function(err){
    // An error occured
})
```
Promises use the [Q library](https://github.com/kriskowal/q), so anything you do after the first `then` call (or `spread`, or `fail`), will be a complete Q promise object. Remember, you must end the query somehow (by calling `then` or one of the other functions) in order to complete the database request.

Each of the following basic methods are available by default on a Collection instance.

  - findOne
  - find
  - create
  - update
  - destroy
  - count

In addition you also have the following helper methods:

  - createEach
  - findOrCreateEach
  - findOrCreate
  - findOneLike
  - findLike
  - startsWith
  - endsWith
  - contains

Based on your Collection attributes you also have dynamic finders. So given a `name` attribute the following queries will be available:

  - findOneByName
  - findOneByNameIn
  - findOneByNameLike
  - findByName
  - findByNameIn
  - findByNameLike
  - countByName
  - countByNameIn
  - countByNameLike
  - nameStartsWith
  - nameEndsWith
  - nameContains

## Pagination

In addition to the other find methods, there are a few helper methods to take care of pagination:

  - skip
  - limit
  - paginate

Skip takes an integer and can be used to skip records:

``` javascript
User.find().skip(20);
```

Limit takes an integer and limits the amount of records returned:

``` javascript
User.find().limit(10);
```

And put together they create the ability to paginate through records as you would pages. For example, if I wanted 'page 2' of a given record set, and I only want to see 10 records at a time, I know that I need to ```skip(10)``` and ```limit(10)``` like so:

``` javascript
User.find().skip(10).limit(10);
```

But, while we are thinking in terms of pagination, or pages, it might be easier to use the final helper - paginate:

``` javascript
User.find().paginate({page: 2, limit: 10});
```

Paginate has several options:

  - ```paginate()``` defaults options to ```{page: 0, limit: 10}```
  - ```paginate({page: 2})``` uses ```{page: 2, limit: 10}``` as the options
  - ```paginate({limit: 20})``` uses ```{page: 0, limit: 20}``` as the options
  - ```paginate({page: 1, limit: 20})``` uses ```{page: 1, limit: 20}``` as the options

It returns a deferred object so that you can continue to chain your helpers.

## Sorting

Sorting can be performed in the deferred object query method `sort` or by adding the sort key into the criteria object. Simply specify an attribute name for natural (ascending) sort, or specify an `asc` or `desc` flag for ascending or descending orders respectively.

```javascript
User.find()
.sort('roleId asc')
.sort({ createdAt: 'desc' })
.exec(function(err, users) {
  // Do stuff here
});
```


## Validations

Validations are handled by [Anchor](https://github.com/balderdashy/anchor) which is based off of [Node Validate](https://github.com/chriso/node-validator) and supports most of the properties in node-validate. For a full list of validations see: [Anchor Validations](https://github.com/balderdashy/anchor/blob/master/lib/rules.js).

Validations are defined directly in you Collection attributes. In addition you may set the attribute `type` to any supported Anchor type and Waterline will build a validation and set the schema type as a string for that attribute.

Validation rules may be defined as simple values or functions (both sync and async) that return the value to test against.

```javascript
var User = Waterline.Collection.extend({

  attributes: {

    firstName: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 15
    },

    lastName: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 100
    },

    age: {
      type: 'integer',
      after: '12/12/2001'
    },

    website: {
      type: 'string',
      // Validation rule may be defined as a function. Here, an async function is mimicked.
      contains: function(cb) {
        setTimeout(function() {
          cb('http://');
        }, 1);
      }
    }
  }
});

var Event = Waterline.Collection.extend({

  attributes: {

    startDate: {
      type: 'date',
      // Validation rule functions allow you to validate values against other attributes
      before: function() {
        return this.endDate;
      }
    },

    endDate: {
      type: 'date',
      after: function() {
        return this.startDate;
      }
    }

  }

}
```
## Custom Types
You can define your own types and their validation with the `types` hash. It's possible to access and compare values to other attributes.

```javascript
var User = Waterline.Collection.extend({
  types: {
    point: function(latlng){
     return latlng.x && latlng.y
    },

    password: function(password) {
      return password === this.passwordConfirmation;
    });
  },

  attributes: {
    firstName: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 15
    },

    location: {
      //note, that the base type (json) still has to be define
      type: 'json',
      point: true
    },

    password: {
      type: 'string',
      password: true
    },

    passwordConfirmation: {
      type: 'string'
    }
  }
});
```

## Indexing

You can add an index property to any attribute to create an index if your adapter supports it. This comes in handy when performing repeated queries
against a key.

```javascript
var User = Waterline.Collection.extend({

  attributes: {

    serviceID: {
      type: 'integer',
      index: true
    }
  }
});
```

Currently Waterline doesn't support multi-column indexes in the attributes definition. If you would like to build any sort of special index you will still
need to build that manually. Also note when adding a `unique` property to an attribute an index will automatically be created for that attribute so there is no
need to specifiy it.

There is currently an issue with adding indexes to string fields. Because Waterline performs it's queries in a case insensitive manner we are unable to use the index on a string attribute. There are some workarounds being discussed but nothing is implemented so far. This will be updated in the near future to fully support indexes on strings.

## Lifecycle Callbacks

Lifecycle callbacks are functions you can define to run at certain times in a query. They are useful for mutating data before creating or generating properties before they are validated.

**Callbacks run on Create**

  - beforeValidation / *fn(values, cb)*
  - afterValidation / *fn(values, cb)*
  - beforeCreate / *fn(values, cb)*
  - afterCreate / *fn(newlyInsertedRecord, cb)*

**Callbacks run on Update**

  - beforeValidation / *fn(valuesToUpdate, cb)*
  - afterValidation / *fn(valuesToUpdate, cb)*
  - beforeUpdate / *fn(valuesToUpdate, cb)*
  - afterUpdate / *fn(updatedRecord, cb)*

**Callbacks run on Destroy**

  - beforeDestroy / *fn(criteria, cb)*
  - afterDestroy / *fn(cb)*

## Tests

All tests are written with [mocha](http://visionmedia.github.com/mocha/) and should be run with [npm](http://npmjs.org):

``` bash
  $ npm test
```
