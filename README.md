# [<img title="waterline-logo" src="http://i.imgur.com/3Xqh6Mz.png" width="610px" alt="Waterline logo"/>](http://waterlinejs.org)

[![NPM version](https://badge.fury.io/js/waterline.svg)](http://badge.fury.io/js/waterline)
[![Master Branch Build Status](https://travis-ci.org/balderdashy/waterline.svg?branch=master)](https://travis-ci.org/balderdashy/waterline)
[![Master Branch Build Status (Windows)](https://ci.appveyor.com/api/projects/status/tdu70ax32iymvyq3?svg=true)](https://ci.appveyor.com/project/mikermcneil/waterline)
[![StackOverflow (waterline)](https://img.shields.io/badge/stackoverflow-waterline-blue.svg)]( http://stackoverflow.com/questions/tagged/waterline)
[![StackOverflow (sails)](https://img.shields.io/badge/stackoverflow-sails.js-blue.svg)]( http://stackoverflow.com/questions/tagged/sails.js)

Waterline is a next-generation storage and retrieval engine, and the default ORM used in the [Sails framework](http://sailsjs.com).

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get and store things like users, whether they live in Redis, MySQL, MongoDB, or Postgres.

Waterline strives to inherit the best parts of ORMs like ActiveRecord, Hibernate, and Mongoose, but with a fresh perspective and emphasis on modularity, testability, and consistency across adapters.

> Looking for the version of Waterline used in Sails v0.12?  See the [0.11.x branch](https://github.com/balderdashy/waterline/tree/0.11.x) of this repo.  If you're upgrading to v0.13 from a previous release of Waterline _standalone_, take a look at the [upgrading guide](http://sailsjs.com/documentation/upgrading/to-v-1-0).

## Installation
Install from NPM.

```bash
  $ npm install waterline --save
```

## Overview
Waterline uses the concept of an adapter to translate a predefined set of methods into a query that can be understood by your data store. Adapters allow you to use various datastores such as MySQL, PostgreSQL, MongoDB, Redis, etc. and have a clear API for working with your model data.

Waterline supports [a wide variety of adapters](http://sailsjs.com/documentation/concepts/extending-sails/adapters/available-adapters), both core and community maintained.

## Usage

The up-to-date documentation for Waterline is maintained on the [Sails framework website](http://sailsjs.com).
You can find detailed API reference docs under [Reference > Waterline ORM](http://sailsjs.com/documentation/reference/waterline-orm).  For conceptual info (including Waterline standalone usage), and answers to common questions, see [Concepts > Models & ORM](http://sailsjs.com/docs/concepts/extending-sails/adapters/custom-adapters).

#### Help

Check out the recommended [community support options](http://sailsjs.com/support) for tutorials and other resources.  If you have a specific question, or just need to clarify how something works, [ask for help](https://gitter.im/balderdashy/sails) or reach out to the core team [directly](http://sailsjs.com/flagship).

You can keep up to date with security patches, the Waterline release schedule, new database adapters, and events in your area by following us ([@sailsjs](https://twitter.com/sailsjs)) on Twitter.

## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/waterline.svg)](http://npmjs.com/package/waterline)
To report a bug, [click here](http://sailsjs.com/bugs).

## Contribute
Please observe the guidelines and conventions laid out in our [contribution guide](http://sailsjs.com/documentation/contributing) when opening issues or submitting pull requests.

#### Tests
All tests are written with [mocha](https://mochajs.org/) and should be run with [npm](https://www.npmjs.com/):

``` bash
  $ npm test
```
<!--
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
cascade                               | false           | Set to `true` to automatically "empty out" (i.e. call `replaceCollection(..., ..., [])`) on plural ("collection") associations when deleting a record.  _Note: In order to do this when the `fetch` meta key IS NOT enabled (which it is NOT by default), Waterline must do an extra `.find().select('id')` before actually performing the `.destroy()` in order to get the IDs of the records that would be destroyed._
fetch                                 | false           | For adapters: When performing `.update()` or `.create()`, set this to `true` to tell the database adapter to send back all records that were updated/destroyed.  Otherwise, the second argument to the `.exec()` callback is `undefined`.  Warning: Enabling this key may cause performance issues for update/destroy queries that affect large numbers of records.
skipAllLifecycleCallbacks             | false           | Set to `true` to prevent lifecycle callbacks from running in the query.
skipRecordVerification                | false           | Set to `true` to skip Waterline's post-query verification pass of any records returned from the adapter(s).  Useful for tools like sails-hook-orm's automigrations.  **Warning: Enabling this flag causes Waterline to ignore `customToJSON`!**
skipExpandingDefaultSelectClause      | false           | Set to `true` to force Waterline to skip expanding the `select` clause in criteria when it forges stage 3 queries (i.e. the queries that get passed in to adapter methods).  Normally, if a model declares `schema: true`, then the S3Q `select` clause is expanded to an array of column names, even if the S2Q had factory default `select`/`omit` clauses (which is also what it would have if no explicit `select` or `omit` clauses were included in the original S1Q.) Useful for tools like sails-hook-orm's automigrations, where you want temporary access to properties that aren\'t necessarily in the current set of attribute definitions.  **Warning: Do not use this flag in your web application backend-- or at least [ask for help](https://sailsjs.com/support) first.**


#### Related model settings

To provide per-model/orm-wide defaults for the `cascade` or `fetch` meta keys, there are a few different model settings you might take advantage of:

```javascript
{
  attributes: {...},
  primaryKey: 'id',

  cascadeOnDestroy: true,

  fetchRecordsOnUpdate: true,
  fetchRecordsOnDestroy: true,
  fetchRecordsOnCreate: true,
  fetchRecordsOnCreateEach: true,
}
```

> Not every meta key will necessarily have a model setting that controls it-- in fact, to minimize peak configuration complexity, most will probably not.
-->



## License &nbsp; <a href="http://sailsjs.com" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>
[MIT](http://sailsjs.com/license). Copyright © 2012-2017 Mike McNeil, Balderdash Design Co., & The Sails Company

[Waterline](http://waterlinejs.org), like the rest of the [Sails framework](http://sailsjs.com), is free and open-source under the [MIT License](http://sailsjs.com/license).

![image_squidhome@2x.png](http://sailsjs.com/images/bkgd_squiddy.png)

&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;


&nbsp;




## Experimental features

Below, you'll find a handful of experimental features that you might enjoy.

> Please be aware that these are in the early stages and should not be relied upon
> as production features of Waterline.  They could change at any time-- even on a patch
release!  **You have been warned!**

#### Experimental lifecycle and accessor methods

```js
var Waterline = require('waterline');
```

+ `Waterline.start(opts, done)`
+ `Waterline.stop(orm, done)`
+ `Waterline.getModel(modelIdentity, orm)`

> For detailed usage, see the source code (bottom of `lib/waterline.js` in this repo.)
