# How Waterline Works


## High-Level Diagram

> This is a very rough/early pass at an architectural doc, and it only covers a subset of the major components inside of Waterline, but I wanted to include a link to it here in case it was helpful for anyone.
>
> [How Waterline Works (diagram)](https://docs.google.com/a/balderdashdesign.com/drawings/d/1u7xb5jDY5i2oeVRP2-iOGGVsFbosqTMWh9wfmY3BTfw/edit?usp=sharing)


## Overview: Talking to the database

There are two different approaches for talking to the database using Waterline.

### Waterline queries

The first, and simplest, is by building and executing a **Waterline query** -- most commonly by calling a model method to get a chainable deferred object:

```js
User.find()
.where({
  occupation: 'doctor'
})
.omit('occupation')
.limit(30)
.skip(90)
.sort('name asc')
.exec(function (err, userRecords){

});
```

### Statements

The second, lower-level approach to talking to your database with Waterline is to build and execute a **statement** -- most commonly by calling a datastore method:

```js
sails.datastore('mysql').sendStatement({
  select: ['*'],
  from: 'inventory',
  where: {
    type: 'snack'
  }
}).exec(function (err, result) {

});
```

> Statements expect you to use column names, not attribute names.




## Querying (implementation)

When you run a query in Waterline, the data structure goes through 5 different stages.

### Stage 1 query

> _aka "Query instance" / "deferred object"_

Stage 1 queries are Query instances; i.e. the deferred object you get from calling a model method.

For example:
```
var q = User.findOne({
  omit: 'occupation',
  where: {
    occupation: 'doctor'
  },
  skip: 90,
  sort: 'name asc'
}).populate('friends', {
  where: {
    occupation: 'doctor'
  },
  sort: 'yearsInIndustry DeSc'
});
```


### Stage 2 query

> _aka "logical protostatement"_

Under the covers, when you call `.exec()`, Waterline expands the stage 1 query into a dictionary (i.e. plain JavaScript object).

This is what's known as a "Phase 2 query":

```js
{
  method: 'findOne', // << the name of the method
  using: 'user', // << the identity of the model

  // The criteria dictionary
  // (because this is "find"/"findOne", "update")
  criteria: {

    // The expanded "omit" clause
    // (note that either "omit" or "select" is ALWAYS set.  For no projection, expect `omit: []`.  `select` is NEVER `[]`.)
    omit: [
      'occupation'
    ],

    // The expanded "where" clause
    where: {
      and: [
        { occupation: 'doctor' }
      ]
    },

    // The "limit" clause (if there is one, otherwise defaults to -1)
    limit: -1,

    // The "skip" clause (if there is one, otherwise defaults to -1)
    skip: 90,

    // The expanded "sort" clause
    sort: [
      { name: 'ASC' }
    ]
  },

  // The `populates` array.
  // (if nothing was populated, this would be empty.)
  populates: [
    {
      omit: [],
      where: {
        occupation: 'doctor'
      },
      limit: -1,
      skip: -1,
      sort: 'yearsInIndustry DESC'
    }
  ]

}
```


### Stage 3 query

> _aka "physical protostatement"_


Next, Waterline performs a couple of additional transformations:

+ replaces `method: 'findOne'` with `method: 'find'` (and updates `limit` accordingly)
+ replaces attribute names with column names
+ replaces the model identity with the table name
+ removed `populates` (or potentially replaced it with `joins`)
  + this varies-- keep in mind that sometimes multiple physical protostatements will be built up and sent to different adapters-- or even the same one.

```js
{
  method: 'find', //<< note that "findOne" was replaced with "find"
  using: 'users', //<< the table name
  criteria: {
    omit: [
      'occupation_key'
    ],
    where: {
      and: [
        { occupation_key: 'doctor' }
      ]
    },
    limit: 2,//<< note that this was set to `2` automatically
    skip: 90,
    sort: [
      { full_name: 'ASC' }
    ]
  }
}
```

This physical protostatement is what gets sent to the database adapter.



Note that, in some cases, multiple different physical protostatements will be built up.

For example, if Waterline decides that it is a good idea (based on the variety of logical query
this is, which datastores it spans, and the support implemented in adapters), then it will transform
the method to `join`, and provide additional info:

```js
{
  method: 'join', //<< note that "findOne" was replaced with "join"
  using: 'users', //<< the table name
  criteria: {
    omit: [
      'occupation_key'
    ],
    where: {
      and: [
        { occupation_key: 'doctor' }
      ]
    },
    limit: 2,//<< note that this was set to `2` automatically
    skip: 90,
    sort: [
      { full_name: 'ASC' }
    ]
  },
  joins: [
    // TODO: document `joins`
  ]
}
```



### Stage 4 query

> _aka "statement"_

In the database adapter, the physical protostatement is converted into an actual _statement_:

```js
{
  from: 'users',
  omit: [
    'occupation_key'
  ],
  where: {
    and: [
      { occupation_key: 'doctor' }
    ]
  },
  limit: 2,
  skip: 90,
  sort: [
    { full_name: 'ASC' }
  ]
}
```

This is the same kind of statement that you can send directly to the lower-level driver.  Statements are _much_ closer to native queries (e.g. SQL query or MongoDB native queries).  They are still more or less database-agnostic, but less regimented, and completely independent from the database schema.



### Stage 5 query

> _aka "native query"_

In the database driver, the statement is compiled into a native query:

```js
SELECT * ....urhg..wait a sec.
```











## Validating a criteria

#### If key is `and` or `or`...
Then this is a predicate operator that should have an array on the RHS.


#### For any other key...

The key itself must be a valid attr name or column name.

The meaning of the RHS depends on its type:

=> string, number, boolean, or null
 => indicates an equality filter

=> array
  => indicates shortcut notation for "IN"
  => (should be normalized into `{in: ['...']}` automatically -- never allowed if expecting it to already be normalized)

=> dictionary
  => indicates a subattribute modifier
  => The type expectation for the dictionary itself varies.
  => (but note that `{'!':[...]}` should be normalized into `{nin: ['...']}` automatically -- never allowed if expecting it to already be normalized)

=> misc
  => never allowed




Examples:
-------------------------------------------------------------------------------------

{ occupation: 'doctor' },
{ occupation: 23523 },
{ occupation: null },
{ occupation: true },
{ occupation: false },
{ occupation: false },

{ occupation: { not: 'doctor' } },
{ occupation: { not: 23523 } },
{ occupation: { not: null } },
{ occupation: { not: true } },
{ occupation: { not: false } },

{ occupation: { in: ['doctor', 'nurse'] } },
{ occupation: { in: [true, false, 283523, null] } },

{ occupation: { nin: ['doctor', 'nurse'] } },
{ occupation: { nin: [true, false, 283523, null] } },

{ occupation: { contains: 'asdf' } },
{ occupation: { like: 'asdf' } },
{ occupation: { startsWith: 'asdf' } },
{ occupation: { endsWith: 'asdf' } },


