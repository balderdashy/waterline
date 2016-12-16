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
Please observe the guidelines and conventions laid out in our [contribution guide](http://sailsjs.com/contribute) when opening issues or submitting pull requests.

#### Tests
All tests are written with [mocha](https://mochajs.org/) and should be run with [npm](https://www.npmjs.com/):

``` bash
  $ npm test
```

## Meta Keys

As of Waterline 0.13 (Sails v1.0), these keys allow end users to modify the behaviour of Waterline methods. You can pass them as the `meta` query key, or via the `.meta()` query modifier method:

```javascript
SomeModel.find()
.meta({
  skipAllLifecycleCallbacks: true
})
.exec();
```

Meta Key                              | Default         | Purpose
:------------------------------------ | :---------------| :------------------------------
skipAllLifecycleCallbacks             | false           | Set to `true` to prevent lifecycle callbacks from running in the query.
cascadeOnDestroy                      | false           | Set to `true` to automatically "empty out" (i.e. call `replaceCollection()`) on plural ("collection") associations when deleting a record.  Under the covers, what this actually means varies depending on whether the association is _exclusive_ (has a _singular_ association on the other side) or _non-exclusive_ (has a _plural_ association on the other side).  Basically, it either sets the other side to `null`, or it deletes junction records.  See the documentation for `replaceCollection()` for more information.  _Note: In order to do this when the `fetchRecordsOnDestroy` meta key IS NOT enabled (the default configuration), Waterline must do an extra `.find().select('id')` before actually performing the `.destroy()` in order to get the IDs of the records that would be destroyed._
fetchRecordsOnUpdate                  | false           | For adapters: set to `true` to tell the database adapter to send back all records that were updated.  Otherwise, the second argument to the `.update()` callback is the raw output from the underlying driver  Warning: Enabling this key may cause performance issues for update queries that affect large numbers of records.
fetchRecordsOnDestroy                 | false           | For adapters: set to `true` to tell the database adapter to send back all records that were destroyed.  Otherwise, the second argument to the `.destroy()` callback is the raw output from the underlying driver.  Warning: Enabling this key may cause performance issues for destroy queries that affect large numbers of records.

#### Providing defaults for meta keys

To provide app/process-wide defaults for meta keys, use the `meta` model setting.

```
//api/models/SomeModel.js
{
  attributes: {...},
  primaryKey: 'id',
  meta: {
    fetchRecordsOnUpdate: true
  }
}
```



## License
[MIT](http://sailsjs.com/license). Copyright © 2012-2016 Balderdash Design Co.

Waterline, like the rest of the [Sails framework](http://sailsjs.com), is free and open-source under the [MIT License](http://sailsjs.com/license).


![image_squidhome@2x.png](http://sailsjs.com/images/bkgd_squiddy.png)
