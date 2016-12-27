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
  select: ['name', 'age', 'createdAt'],
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

This is what's known as a "Stage 2 query":

```js
{
  method: 'findOne', // << the name of the method
  using: 'user', // << the identity of the model

  // The criteria dictionary
  // (because this is "find"/"findOne", "update", "destroy", "count", "sum", or "avg")
  criteria: {

    // The expanded "select" clause
    // (note that the only reason this is not `['*']` is because we specified an explicit `select` or `omit`
    // It will ALWAYS include the primary key.)
    // For no projections, this is `select: ['*']`.  And `select` is NEVER allowed to be `[]`.)
    select: [
      'id',
      'name',
      'age',
      'createdAt'
    ],

    // The expanded "omit" clause
    // (always empty array, unless we provided an `omit`.  If `omit` is anything other than [], then `select` must be `['*']` -- and vice versa)
    omit: [],

    // The expanded "where" clause
    where: {
      and: [
        { occupation: 'doctor' }
      ]
    },

    // The "limit" clause (if there is one, otherwise defaults to `Number.MAX_SAFE_INTEGER`)
    limit: 9007199254740991,

    // The "skip" clause (if there is one, otherwise defaults to 0)
    skip: 0,

    // The expanded "sort" clause
    sort: [
      { name: 'ASC' }
    ]
  },

  // The `populates` clause.
  // (if nothing was populated, this would be an empty dictionary.)
  populates: {

    // The keys inside of `populates` are either:
    // • `true` - if this is a singular ("model") association
    // • a subcriteria - if this is a plural ("collection") association a fully-normalized, stage 2 Waterline criteria
    // • `false` - special case, only for when this is a plural ("collection") association: when the provided subcriteria would actually be a no-op that will always end up as `[]`
    //
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // > Side note about what to expect under the relevant key in record(s) when you populate vs. don't populate:
    // > • When populating a singular association, you'll always get either a dictionary (a child record) or `null` (if no child record matches the fk; e.g. if the fk was old, or if it was `null`)
    // > • When populating a plural association, you'll always get an array of dictionaries (child records).  Of course, it might be empty.
    // > • When NOT populating a singular association, you'll get whatever is stored in the database (there is no guarantee it will be correct-- if you fiddle with your database directly at the physical layer, you could mess it up).  Note that we ALWAYS guarantee that the key will be present though, so long as it's not being explicitly excluded by `omit` or `select`.  i.e. even if the database says it's not there, the key will exist as `null`.
    // > • When NOT populating a plural association, you'll never get the key.  It won't exist on the resulting record(s).
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    friends: {
      select: [ '*' ],
      omit: [],
      where: {
        and: [
          { occupation: 'doctor' }
        ]
      },
      limit: (Number.MAX_SAFE_INTEGER||9007199254740991),
      skip: 0,
      sort: [
        { yearsInIndustry: 'DESC' }
      ]
    }

  }

}
```


### Stage 3 query

> _aka "physical protostatement"_


Next, Waterline performs a couple of additional transformations:

+ replaces `method: 'findOne'` with `method: 'find'` (and updates `limit` accordingly)
+ replaces attribute names with column names
+ replaces the model identity with the table name
+ removed `populates` (or potentially replaced it with `joins`)
  + this varies-- keep in mind that sometimes _multiple physical protostatements will be built up and sent to different adapters_-- or even the same one.
  + if `joins` is added, then this would replace `method: 'findOne'` or `method: 'find'` with `method: 'join'`.

```js
{
  method: 'find', //<< note that "findOne" was replaced with "find"
  using: 'users', //<< the table name
  criteria: {
    select: [
      'id',
      'full_name',
      'age',
      'created_at',
      'updated_at'
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



> Note that, in some cases, **multiple different physical protostatements** will be built up, and sent to the same or different adapters.

For example, if Waterline decides that it is a good idea (based on the variety of logical query
this is, which datastores it spans, and the support implemented in adapters), then it will transform
the method to `join`, and provide additional info:

```js
{
  method: 'join', //<< note that "findOne" was replaced with "join"
  using: 'users', //<< the table name
  criteria: {
    select: [
      'id',
      'full_name',
      'age',
      'created_at',
      'updated_at'
    ],
    where: {
      and: [
        { occupation_key: 'doctor' }
      ]
    },
    limit: 2,//<< note that this was STILL set to `2` automatically
    skip: 90,
    sort: [
      { full_name: 'ASC' }
    ],

    // If `method` is `join`, then join instructions will be included in the criteria:
    joins: [
      // TODO: document `joins`
    ]
  },
}
```



### Stage 4 query

> _aka "statement"_

In the database adapter, the physical protostatement is converted into an actual _statement_:

```js
{
  from: 'users',
  select: [
    'id',
    'full_name',
    'age',
    'created_at',
    'updated_at'
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
SELECT id, full_name, age, created_at, updated_at FROM users WHERE occupation_key="doctor" LIMIT 2 SKIP 90 SORT full_name ASC;
```




## Example `where` clause iterator

See https://gist.github.com/mikermcneil/8252ce4b7f15d9e2901003a3a7a800cf for an example of an iterator for a stage 2 query's `where` clause.





## Query pipeline (example)

Here's a quick example that demonstrates how this all fits together.

It operates under these assumptions:

1. A person have exactly one mom (also a Person)
2. A person can have many "cats" (Cat), and they can have many "humanFriends" (Person)
3. A person can have many "dogs" (Dog), but every dog has one "owner" (Person)



Given the following stage 1 query:

```js
// A stage 1 query
var q = Person.find({
  select: ['name', 'age']
})
.populate('mom')
.populate('dogs')
.populate('cats', {
  where: { name: { startsWith: 'Fluffy' } },
  limit: 50,
  sort: 'age DESC',
  omit: ['age']
});
```

It would be forged into the following stage 2 query:

```js
// A stage 2 query
{

  method: 'find',

  using: 'person',

  meta: {},

  criteria: {
    where: {},
    limit: 9007199254740991,
    skip: 0,
    sort: [ { id: 'ASC' } ], //<< implicitly added
    select: ['id', 'name', 'age', 'mom'],
    //^^ note that it automatically filled in the pk attr,
    // as well as the fk attrs for any model associations
    // being populated.  (if omit was specified instead,
    // then it would have been checked to be sure that neither
    // the pk attr nor any necessary fk attrs were being explicitly
    // omitted.  If any were, Waterline would refuse to run the query.)
  },

  populates: {
    mom: true,
    dogs: {
      where: {},
      limit: 9007199254740991,
      skip: 0,
      sort: [ { id: 'ASC' } ], //<< implicitly added
      select: ['*']
    },
    cats: {
      where: {
        and: [
          { name: { startsWith: 'Fluffy' } }
        ]
      },
      limit: 50,
      skip: 0,
      sort: [ { age: 'DESC' } ],
      omit: ['age']
    }
  }

}
```


Then, it would then be forged into one or more stage 3 queries, depending on the datastores/adapters at work.  For example:

```js
// A stage 3 query
{
  method: 'find',
  using: 'the_person_table',
  meta: {},
  criteria: {
    where: {},
    limit: 9007199254740991,
    skip: 0,
    sort: [ { id_colname: 'ASC' } ],
    select: ['id_colname', 'name_col_____name', 'age_whatever', 'mom_fk_col_name']
    // If this had been `['*']`, then the `select` clause would have simply been omitted.
  },
  // Note that `joins` might sometimes be included here.
  // But since this example is xD/A, the `joins` key would not exist.
}
```


```js
// Another stage 3 query (for "cats")
{
  method: 'find',
  using: 'the_cat_table',
  meta: {},
  criteria: {
    where: {
      and: [
        { id_colname: { in: [ 39, 844, 2, 3590, 381, 3942, 93, 3959, 1, 492, 449, 224 ] } },
        //^^ injected b/c this is implementing part of an xD/A populate
        { name_colname: { startsWith: 'Fluffy' } }
      ]
    },
    limit: 50,
    skip: 0,
    sort: [ { age_col_name: 'DESC' } ],
    select: ['id_colname', 'name_colname__', '_temperament_colname'],
    // Note that even though this was an `omit`, it was expanded.
  }
}
```


```js
// Yet another stage 3 query  (for "mom")
{
  method: 'find',
  using: 'the_person_table',
  meta: {},
  criteria: {
    where: {
      and: [
        { id_colname: { in: [ 2323, 3291, 38, 1399481 ] } }
        //^^ injected b/c this is implementing part of an xD/A populate
      ]
    },
    limit: 9007199254740991,
    skip: 0,
    sort: [ { id_colname: 'ASC' } ],
    select: ['id_colname', 'name_col_____name', 'age_whatever', 'mom_fk_col_name']
    // ^This is always fully expanded, because you can't currently specify a subcriteria for a model association.
  }
}
```


_etc._




## Validating/normalizing a criteria's `where` clause

#### If key is `and` or `or`...
Then this is a predicate operator that should have an array on the RHS.

#### For any other key...

The key itself must be a valid attr name or column name (depending on if this is a stage 2 or stage 3 query).

The meaning of the RHS depends on its type:

=> string, number, boolean, or null
 => indicates an equality constraint

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









## Glossary

Quick reference for what various things inside of the query are called.

> These notes are for the stage 2 and stage 3 queries-- but they are mostly applicable to stage 1 queries and stage 4 queries as well.  Just note that stage 1 queries tend to be much more tolerant in general, whereas stage 4 queries are more strict.  Also realize that the details of what is supported in criteria varies slightly between stages.
>
> + For more specific (albeit slightly older and potentially out of date) docs on criteria in stage 4 queries, see https://github.com/treelinehq/waterline-query-docs/blob/99a51109a8cfe5b705f40b987d4d933852a4af4c/docs/criteria.md
> + For more specific (albeit slightly older and potentially out of date) docs on criteria in stage 1 queries, see https://github.com/balderdashy/waterline-criteria/blob/26f2d0e25ff88e5e1d49e55116988322339aad10/lib/validators/validate-sort-clause.js and https://github.com/balderdashy/waterline-criteria/blob/26f2d0e25ff88e5e1d49e55116988322339aad10/lib/validators/validate-where-clause.js


| Word/Phrase            | Meaning |
|:-----------------------|:------------------------------------------------------------------------------|
| query key              | A top-level key in the query itself; e.g. `criteria`, `populates`, `newRecords`, etc.  There are a specific set of permitted query keys (attempting to use any extra keys will cause errors!  But note that instead of attaching ad hoc query keys, you can use `meta` for custom stuff.)
| clause                 | A top-level key in the `criteria`.  There are a specific set of permitted clauses in criterias.  Which clauses are allowed depends on what stage of query this is (for example, stage 3 queries don't permit the use of `omit`, but stage 2 queries _do_)
| `sort` clause          | When fully-normalized, this is an array of >=1 dictionaries called comparator directives.
| comparator directive   | An item within the array of a fully normalized `sort` clause.  Should always be a dictionary with exactly one key, which is the name of an attribute (or column name, if this is a stage 3 query).  The RHS value of the key must always be either 'ASC' or 'DESC'.
| `where` clause         | The `where` clause of a fully normalized criteria always has one key at the top level: either "and" or "or", whose RHS is an array consisting of zero or more conjuncts or disjuncts.
| conjunct               | A dictionary within an `and` array.  When fully normalized, always consists of exactly one key-- an attribute name (or column name), whose RHS is either (A) a nested predicate operator or (B) a filter.
| disjunct               | A dictionary within an `or` array whose contents work exactly like those of a conjunct (see above).
| scruple                | Another name for a dictionary which could be a conjunct or disjunct.  Particularly useful when talking about a stage 1 query, since not everything will have been normalized yet.
| predicate operator     | A _predicate operator_ (or simply a _predicate_) is an array-- more specifically, it is the RHS of a key/value pair where the key is either "and" or "or".  This array consists of 0 or more dictionaries called either "conjuncts" or "disjuncts" (depending on whether it's an "and" or an "or")
| constraint             | A _constraint_ (ska "filter") is the RHS of a key/value pair within a conjunct or disjunct.  It represents how values for a particular attribute name (or column name) will be qualified.  Once normalized, constraints are always either a primitive (called an _equivalency constraint_ or _eq constraint_) or a dictionary (called a _complex constraint_) consisting of exactly one key/value pairs called a "modifier" (aka "sub-attribute modifier").  In certain special cases, (in stage 1 queries only!) multiple different modifiers can be combined together within a complex constraint (e.g. combining `>` and `<` to indicate a range of values).  In stage 2 queries, these have already been normalized out (using `and`).
| modifier               | The RHS of a key/value pair within a complex constraint, where the key is one of a special list of legal modifiers such as `nin`, `in`, `contains`, `!`, `>=`, etc.  A modifier impacts how values for a particular attribute name (or column name) will be qualified.  The data type for a particular modifier depends on the modifier.  For example, a modifier for key `in` or `nin` must be an array, but a modifier for key `contains` must be either a string or number.


```
// Example: Look up records whose name contains "Ricky", as well as being prefixed or suffixed
// with some sort of formal-sounding title.
where: {
  and: [
    { name: {contains: 'Ricky'} },
    {
      or: [
        { name: {endsWith: 'Esq.'} },
        { name: {endsWith: 'Jr.'} },
        { name: {endsWith: 'Sr.'} },
        { name: {endsWith: 'II'} },
        { name: {endsWith: 'III'} },
        { name: {endsWith: 'IV'} },
        { name: {startsWith: 'Dr.'} }
        { name: {startsWith: 'Miss'} }
        { name: {startsWith: 'Ms.'} }
        { name: {startsWith: 'Mrs.'} }
        { name: {startsWith: 'Mr.'} },
        { name: {startsWith: 'Rvd.'} }
      ]
    }
  ]
}
```




## Associations

### Broad classifications of associations:

+ singular (association which declares `model`)
+ plural (association which declares `collection`)

*There is also a distinction between one-way and two-way associations:*

"Two-way" just means that there's another "side" to the association-- i.e. that, if you change the association, the expected results when you populate the other side of the association change-- _automatically_ (and in some cases, they actually change at the physical layer when you make the original change).  "One-way" means that there is no other side.  If you change a one-way association, no other associations are affected.

There are three different kinds of two-way associations, and two different kinds of one-way associations.  Here they are:

### The various kinds of two-way associations:

+ plural, two-way, *exclusive*   (plural association whose `via` is pointing at a singular association on the other side)
+ singular, two-way (singular association who is pointed at on the other side by a plural association w/ `via`)
+ plural, two-way, *shared*  (plural association whose `via` is pointing at a plural association on the other side with a matching `via`)

### The various kinds of one-way associations:

+ singular, one-way  (singular association who is NOT pointed at by any `via`)
+ plural, one-way (plural association without a `via` of its own, and which is NOT pointed at by `via` on the other side)





## Adapters & auto-migrations

Auto-migrations are now handled outside of Waterline core.

Notes for adapter maintainers who implement `define` et al:



##### Reserved column types

When interpeting `autoMigrations.columnType`, there are a few special reserved column types to be aware of, that should always be handled:
  + `_numberkey` _(e.g. you might understand this as "INTEGER")_
  + `_stringkey` _(e.g. you might understand this as "VARCHAR(255)")_
  + `_numbertimestamp` _(e.g. you might understand this as "BIGINTEGER" -- this is for JS timestamps (epoch ms))_
  + `_stringtimestamp` _(e.g. you might understand this as "VARCHAR(14)")_
  + `_string`  _(e.g. you might understand this as "TEXT")_
  + `_number`  _(e.g. you might understand this as "DOUBLE")_
  + `_boolean` _(e.g. you might understand this as "TINYINT")_
  + `_json`  _(e.g. you might understand this as "TEXT" in MySQL, or "JSON" in PostgreSQL)_
  + `_ref` _(non-JSON-structured data that may or may not be serializable in adapter-specific ways; e.g. you might understand this as "TEXT".)_

These (^^) are the different core Waterline logical data types, but prefixed by underscore (e.g. `_string`) AS WELL AS two special reserved column types (`_numberkey` and `_stringkey`).  These two additional column types are used for primary key and foreign key (singular association) values.  Note that foreign key values could also be null.

##### Unrecognized column types

If `autoMigrations.columnType` for a given attribute is unrecognized for your database, then fail with an error.




## Special cases / FAQ

##### _What is an "exclusive" association?_

It just means a plural association with the special restriction that no two records can have the same associated child records in it.

> This is vs. a "shared" association, which is what we call any plural association that is non-exclusive, as per this definition.

##### _What about *through* associations?_

A *through* association is a subgenre of plural, two-way, shared associations, where you actually can set up the junction model as one of the models in your app-level code.


##### _What about *reflexive* associations?_

A **reflexive** association is just any association where the associated model is the same as the parent model.


##### _What about if you have a plural association with `via` pointed at another plural association, but there is no via on the other side?_

That's an error (i.e. in waterline-schema)*.




## Required vs allowNull vs. defaultsTo vs. autoCreatedAt vs. autoUpdatedAt

Though relatively simple from the perspective of userland, this gets a bit complicated internally in Waterline.

For details, see https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1814738146











