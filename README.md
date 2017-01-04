# [<img title="waterline-logo" src="http://i.imgur.com/3Xqh6Mz.png" width="610px" alt="Waterline logo"/>](http://waterlinejs.org)

[![NPM version](https://badge.fury.io/js/waterline.svg)](http://badge.fury.io/js/waterline)
[![Master Branch Build Status](https://travis-ci.org/balderdashy/waterline.svg?branch=master)](https://travis-ci.org/balderdashy/waterline)
[![Master Branch Build Status (Windows)](https://ci.appveyor.com/api/projects/status/tdu70ax32iymvyq3?svg=true)](https://ci.appveyor.com/project/mikermcneil/waterline)
[![StackOverflow (waterline)](https://img.shields.io/badge/stackoverflow-waterline-blue.svg)]( http://stackoverflow.com/questions/tagged/waterline)
[![StackOverflow (sails)](https://img.shields.io/badge/stackoverflow-sails.js-blue.svg)]( http://stackoverflow.com/questions/tagged/sails.js)

Waterline is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get and store things like users, whether they live in Redis, MySQL, MongoDB, or Postgres.

Waterline strives to inherit the best parts of ORMs like ActiveRecord, Hibernate, and Mongoose, but with a fresh perspective and emphasis on modularity, testability, and consistency across adapters.

For detailed documentation, see [the Waterline documentation](https://github.com/balderdashy/waterline-docs).


> Looking for the version of Waterline used in Sails v0.12?  See https://github.com/balderdashy/waterline/tree/0.11.x.

## Installation
Install from NPM.

```bash
  $ npm install waterline
```

## Overview
Waterline uses the concept of an adapter to translate a predefined set of methods into a query that can be understood by your data store. Adapters allow you to use various datastores such as MySQL, PostgreSQL, MongoDB, Redis, etc. and have a clear API for working with your model data.

It also allows an adapter to define its own methods that don't necessarily fit into the CRUD methods defined by default in Waterline. If an adapter defines a custom method, Waterline will simply pass the function arguments down to the adapter.

#### Community Adapters

  - [PostgreSQL](https://github.com/balderdashy/sails-postgresql) - *0.9+ compatible*
  - [MySQL](https://github.com/balderdashy/sails-mysql) - *0.9+ compatible*
  - [MongoDB](https://github.com/balderdashy/sails-mongo) - *0.9+ compatible*
  - [Memory](https://github.com/balderdashy/sails-memory) - *0.9+ compatible*
  - [Disk](https://github.com/balderdashy/sails-disk) - *0.9+ compatible*
  - [Microsoft SQL Server](https://github.com/cnect/sails-sqlserver)
  - [Redis](https://github.com/balderdashy/sails-redis)
  - [Riak](https://github.com/balderdashy/sails-riak)
  - [Neo4j](https://github.com/natgeo/sails-neo4j)
  - [OrientDB](https://github.com/appscot/sails-orientdb)
  - [ArangoDB](https://github.com/rosmo/sails-arangodb)
  - [Apache Cassandra](https://github.com/dtoubelis/sails-cassandra)
  - [GraphQL](https://github.com/wistityhq/waterline-graphql)
  - [Solr](https://github.com/sajov/sails-solr)
  - [Apache Derby](https://github.com/dash-/node-sails-derby)



## Help
Need help or have a question?  Click [here](http://sailsjs.com/support).


## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/waterline.svg)](http://npmjs.com/package/waterline)
To report a bug, [click here](http://sailsjs.com/bugs).


## Contribute
Please observe the guidelines and conventions laid out in our [contribution guide](http://sailsjs.com/documentation/contributing) when opening issues or submitting pull requests.

#### Tests
All tests are written with [mocha](https://mochajs.org/) and should be run with [npm](https://www.npmjs.com/):

``` bash
  $ npm test
```

## Meta Keys

As of Waterline 0.13 (Sails v1.0), these keys allow end users to modify the behaviour of Waterline methods. You can pass them as the `meta` query key, or via the `.meta()` query modifier method:

```javascript
SomeModel.create({...})
.meta({
  skipAllLifecycleCallbacks: true
})
.exec(...);
```

These keys are not set in stone, and may still change prior to release. (They're posted here now as a way to gather feedback and suggestions.)



Meta Key                              | Default         | Purpose
:------------------------------------ | :---------------| :------------------------------
skipAllLifecycleCallbacks             | false           | Set to `true` to prevent lifecycle callbacks from running in the query.
cascade                               | false           | Set to `true` to automatically "empty out" (i.e. call `replaceCollection(..., ..., [])`) on plural ("collection") associations when deleting a record.  _Note: In order to do this when the `fetch` meta key IS NOT enabled (which it is NOT by default), Waterline must do an extra `.find().select('id')` before actually performing the `.destroy()` in order to get the IDs of the records that would be destroyed._
fetch                                 | false           | For adapters: When performing `.update()` or `.create()`, set this to `true` to tell the database adapter to send back all records that were updated/destroyed.  Otherwise, the second argument to the `.exec()` callback is `undefined`.  Warning: Enabling this key may cause performance issues for update/destroy queries that affect large numbers of records.
skipRecordVerification                | false           | Set to `true` to skip Waterline's post-query verification pass of any records returned from the adapter(s).  Useful for tools like sails-hook-orm's automigration support.


#### Related model settings

To provide per-model/orm-wide defaults for the `cascade` or `fetch` meta keys, there are a few different model settings you might take advantage of:

```javascript
{
  attributes: {...},
  primaryKey: 'id',

  cascadeOnDestroy: true,
  fetchRecordsOnUpdate: true,
  fetchRecordsOnDestroy: true,
}
```

> Not every meta key will necessarily have a model setting that controls it-- in fact, to minimize peak configuration complexity, most will probably not.


## New methods

Rough draft of documentation for a few new methods available in Waterline v0.13.


#### replaceCollection()

Replace the specified collection of one or more parent records with a new set of members.

```javascript
// For users 3 and 4, change their "pets" collection to contain ONLY pets 99 and 98.
User.replaceCollection([3,4], 'pets')
.members([99,98])
.exec(function (err) {
  // ...
});
```

Under the covers, what this method _actually does_ varies depending on whether the association passed in uses a junction or not.

> We know a plural association must use a junction if either (A) it is one-way ("via-less") or (B) it reciprocates another _plural_ association.

If the association uses a junction, then any formerly-ascribed junction records are deleted, and junction records are created for the new members.  Otherwise, if the association _doesn't_ use a junction, then the value of the reciprocal association in former child records is set to `null`, and the same value in newly-ascribed child records is set to the parent record's ID.  (Note that, with this second category of association, there can only ever be _one_ parent record.  Attempting to pass in multiple parent records will result in an error.)


#### addToCollection()

Add new members to the specified collection of one or more parent records.

```javascript
// For users 3 and 4, add pets 99 and 98 to the "pets" collection.
// > (if either user record already has one of those pets in its "pets",
// > then we just silently skip over it)
User.addToCollection([3,4], 'pets')
.members([99,98])
.exec(function(err){
  // ...
});
```


#### removeFromCollection()

Remove members from the the specified collection of one or more parent records.

```javascript
// For users 3 and 4, remove pets 99 and 98 from their "pets" collection.
// > (if either user record does not actually have one of those pets in its "pets",
// > then we just silently skip over it)
User.removeFromCollection([3,4], 'pets')
.members([99,98])
.exec(function(err) {
  // ...
});
```




## License
[MIT](http://sailsjs.com/license). Copyright © 2012-2017 Mike McNeil, Balderdash Design Co., & The Sails Company

Waterline, like the rest of the [Sails framework](http://sailsjs.com), is free and open-source under the [MIT License](http://sailsjs.com/license).


![image_squidhome@2x.png](http://sailsjs.com/images/bkgd_squiddy.png)
