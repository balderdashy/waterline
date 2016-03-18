# [<img title="waterline-logo" src="http://i.imgur.com/3Xqh6Mz.png" width="810px" alt="Waterline logo"/>](https://github.com/balderdashy/waterline)

[![Build Status](https://travis-ci.org/balderdashy/waterline.svg?branch=master)](https://travis-ci.org/balderdashy/waterline)
[![NPM version](https://badge.fury.io/js/waterline.svg)](http://badge.fury.io/js/waterline)
[![Dependency Status](https://gemnasium.com/balderdashy/waterline.svg)](https://gemnasium.com/balderdashy/waterline)
[![Test Coverage](https://codeclimate.com/github/balderdashy/waterline/badges/coverage.svg)](https://codeclimate.com/github/balderdashy/waterline)
[![StackOverflow](https://img.shields.io/badge/stackoverflow-waterline-blue.svg)]( http://stackoverflow.com/questions/tagged/waterline)

Waterline is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get and store things like users, whether they live in Redis, MySQL, MongoDB, or Postgres.

Waterline strives to inherit the best parts of ORMs like ActiveRecord, Hibernate, and Mongoose, but with a fresh perspective and emphasis on modularity, testability, and consistency across adapters.

For detailed documentation, go to [Waterline Documentation](https://github.com/balderdashy/waterline-docs) repository.

## Installation

Install from NPM.

```bash
$ npm install waterline
```

## Overview

Waterline uses the concept of an Adapter to translate a predefined set of methods into a query that can be understood by your data store. Adapters allow you to use various datastores such as MySQL, PostgreSQL, MongoDB, Redis, etc. and have a clear API for working with your model data.

It also allows an adapter to define it's own methods that don't necessarily fit into the CRUD methods defined by default in Waterline. If an adapter defines a custom method, Waterline will simply pass the function arguments down to the adapter.

You may also supply an array of adapters and Waterline will map out the methods so they are both mixed in. It works similar to Underscore's [Extend](http://underscorejs.org/#extend) method where the last item in the array will override any methods in adapters before it. This allows you to mixin both the traditional CRUD adapters such as MySQL with specialized adapters such as Twilio and have both types of methods available.

#### Community Adapters

  - [PostgreSQL](https://github.com/balderdashy/sails-postgresql) - *0.9+ compatible*
  - [MySQL](https://github.com/balderdashy/sails-mysql) - *0.9+ compatible*
  - [MongoDB](https://github.com/balderdashy/sails-mongo) - *0.9+ compatible*
  - [Memory](https://github.com/balderdashy/sails-memory) - *0.9+ compatible*
  - [Disk](https://github.com/balderdashy/sails-disk) - *0.9+ compatible*
  - [Microsoft SQL Server](https://github.com/cnect/sails-sqlserver)
  - [Redis](https://github.com/balderdashy/sails-redis)
  - [Riak](https://github.com/balderdashy/sails-riak)
  - [IRC](https://github.com/balderdashy/sails-irc)
  - [Twitter](https://github.com/balderdashy/sails-twitter)
  - [JSDom](https://github.com/mikermcneil/sails-jsdom)
  - [Neo4j](https://github.com/natgeo/sails-neo4j)
  - [OrientDB](https://github.com/appscot/sails-orientdb)
  - [ArangoDB](https://github.com/rosmo/sails-arangodb)
  - [Apache Cassandra](https://github.com/dtoubelis/sails-cassandra)
  - [GraphQL](https://github.com/wistityhq/waterline-graphql)
  - [Solr](https://github.com/sajov/sails-solr)
  - [Apache Derby](https://github.com/dash-/node-sails-derby)


## Support
Need help or have a question?
- [StackOverflow](http://stackoverflow.com/questions/tagged/waterline)
- [Gitter Chat Room](https://gitter.im/balderdashy/sails)


## Issue Submission
Please read the [issue submission guidelines](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md#opening-issues) before opening a new issue.

Waterline and Sails are composed of a [number of different sub-projects](https://github.com/balderdashy/sails/blob/master/MODULES.md), many of which have their own dedicated repository. If you suspect an issue in one of these sub-modules, you can find its repo on the [organization](https://github.com/balderdashy) page, or in [MODULES.md](https://github.com/balderdashy/sails/blob/master/MODULES.md).  Click [here](https://github.com/balderdashy/waterline/search?q=&type=Issues) to search/post issues in this repository.


## Feature Requests
If you have an idea for a new feature, please feel free to submit it as a pull request to the backlog section of the [ROADMAP.md](https://github.com/balderdashy/waterline/blob/master/ROADMAP.md) file in this repository.


## Contribute
Please carefully read our [contribution guide](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md) before submitting a pull request with code changes.


## Tests

All tests are written with [mocha](https://mochajs.org/) and should be run with [npm](https://www.npmjs.com/):

``` bash
  $ npm test
```

## Coverage

To generate the code coverage report, run:

``` bash
  $ npm run coverage
```
And have a look at `coverage/lcov-report/index.html`.

## License

[MIT License](http://sails.mit-license.org/)  Copyright © 2012-2016 Balderdash Design Co.


![image_squidhome@2x.png](http://sailsjs.org/images/bkgd_squiddy.png)
