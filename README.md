# [<img title="waterline-logo" src="http://i.imgur.com/3Xqh6Mz.png" width="610px" alt="Waterline logo"/>](http://waterlinejs.org)

[![Master Branch Build Status](https://travis-ci.org/balderdashy/waterline.svg?branch=master)](https://travis-ci.org/balderdashy/waterline)
[![Master Branch Build Status (Windows)](https://ci.appveyor.com/api/projects/status/tdu70ax32iymvyq3?svg=true)](https://ci.appveyor.com/project/mikermcneil/waterline)
[![StackOverflow (waterline)](https://img.shields.io/badge/stackoverflow-waterline-blue.svg)]( http://stackoverflow.com/questions/tagged/waterline)
[![StackOverflow (sails)](https://img.shields.io/badge/stackoverflow-sails.js-blue.svg)]( http://stackoverflow.com/questions/tagged/sails.js)

Waterline is a next-generation storage and retrieval engine, and the default ORM used in the [Sails framework](https://sailsjs.com).

It provides a uniform API for accessing stuff from different kinds of [databases and protocols](https://sailsjs.com/documentation/concepts/extending-sails/adapters/available-adapters). That means you write the same code to get and store things like users, whether they live in MySQL, MongoDB, neDB, or Postgres.

Waterline strives to inherit the best parts of ORMs like ActiveRecord, Hibernate, and Mongoose, but with a fresh perspective and emphasis on modularity, testability, and consistency across adapters.

## No more callbacks

Starting with v0.13, Waterline takes full advantage of ECMAScript & Node 8's `await` keyword.

**In other words, [no more callbacks](https://gist.github.com/mikermcneil/c1028d000cc0cc8bce995a2a82b29245).**

```js
var newOrg = await Organization.create({
  slug: 'foo'
})
.fetch();
```

> Looking for the version of Waterline used in Sails v0.12?  See the [0.11.x branch](https://github.com/balderdashy/waterline/tree/0.11.x) of this repo.  If you're upgrading to v0.13 from a previous release of Waterline _standalone_, take a look at the [upgrading guide](http://sailsjs.com/documentation/upgrading/to-v-1-0).

## Installation
Install from NPM.

```bash
  $ npm install waterline
```

## Overview
Waterline uses the concept of an adapter to translate a predefined set of methods into a query that can be understood by your data store. Adapters allow you to use various datastores such as MySQL, PostgreSQL, MongoDB, Redis, etc. and have a clear API for working with your model data.

Waterline supports [a wide variety of adapters](http://sailsjs.com/documentation/concepts/extending-sails/adapters/available-adapters), both core and community maintained.

## Usage

The up-to-date documentation for Waterline is maintained on the [Sails framework website](http://sailsjs.com).
You can find detailed API reference docs under [Reference > Waterline ORM](http://sailsjs.com/documentation/reference/waterline-orm).  For conceptual info (including Waterline standalone usage), and answers to common questions, see [Concepts > Models & ORM](http://sailsjs.com/docs/concepts/extending-sails/adapters/custom-adapters).

#### Help

Check out the recommended [community support options](http://sailsjs.com/support) for tutorials and other resources.  If you have a specific question, or just need to clarify [how something works](https://docs.google.com/drawings/d/1u7xb5jDY5i2oeVRP2-iOGGVsFbosqTMWh9wfmY3BTfw/edit), ask [for help](https://gitter.im/balderdashy/sails) or reach out to the [core team](http://sailsjs.com/about) [directly](http://sailsjs.com/flagship).

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


## License
[MIT](http://sailsjs.com/license). Copyright © 2012-present Mike McNeil & The Sails Company

[Waterline](http://waterlinejs.org), like the rest of the [Sails framework](https://sailsjs.com), is free and open-source under the [MIT License](https://sailsjs.com/license).

![image_squidhome@2x.png](http://sailsjs.com/images/bkgd_squiddy.png)
