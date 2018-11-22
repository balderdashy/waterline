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
    occupation: 'doctor',
    age: { '>': 40, '<': 50 }
  },
  sort: 'yearsInIndustry desc'
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
    omit: ['occupation'],

    // The expanded "where" clause
    where: {
      occupation: 'doctor'
    },

    // The "limit" clause (if there is one, otherwise defaults to `Number.MAX_SAFE_INTEGER`)
    limit: 9007199254740991,

    // The "skip" clause (if there is one, otherwise defaults to 0)
    skip: 90,

    // The expanded "sort" clause
    // (an empty array indicates that the adapter's default sort should be used)
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

    friends: {
      select: [ '*' ],
      omit: [],
      where: {
        and: [
          { occupation: 'doctor' },
          {
            and: [
              { age: { '>': 40 } },
              { age: { '<': 50 } }
            ]
          }
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // > Why don't we coallesce the "and"s above?  It's kind of ugly.
          //
          // Performance trumps prettiness here-- S2Qs are for computers, not humans.
          // S1Qs should be pretty, but for S2Qs, the priorities are different.  Instead, it's more important
          // that they (1) are easy to write parsing code for and (2) don't introduce any meaningful overhead
          // when they are built (remember: we're building these on a per-query basis).
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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

##### Side note about populating

```
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // > Side note about what to expect under the relevant key in record(s) when you populate vs. don't populate:
    // > • When populating a singular ("model") attribute, you'll always get either a dictionary (a child record) or `null` (if no child record matches the fk; e.g. if the fk was old, or if it was `null`)
    // > • When populating a plural ("collection") attribute, you'll always get an array of dictionaries (a collection, consisting of child records).  Of course, it might be empty.
    // > • When NOT populating a singular ("model") attribute, you'll get whatever is stored in the database (there is no guarantee it will be correct-- if you fiddle with your database directly at the physical layer, you could mess it up).  Note that we ALWAYS guarantee that the key will be present though, so long as it's not being explicitly excluded by `omit` or `select`.  i.e. even if the database says it's not there, the key will exist as `null`.
    // > • When NOT populating a plural ("collection") attribute, you'll never get the key.  It won't exist on the resulting parent record(s).
    // > • If populating a plural ("collection") attribute, and child records w/ duplicate ids exist in the collection (e.g. because of a corrupted physical database), any duplicate child records are stripped out.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

Also, some more formal terminology:

+ Ideally, one uses the word "association" when one wants to refer to _both sides_ of the association *at the same time*.  It's still possible to understand what it means more generally or when referring to a particular attribute, but it's one of those things that's helpful to be able to get a bit more formal about sometimes.
+ When one needs to be specific, one refers to the attribute defs themselves as "singular attributes" (or more rarely: "model attribute")  and "plural attribute" (aka "collection attribute").
+ one uses "singular" and "plural" to refer to a _particular side_ of the association.  So really, in that parlance, an "association" is never wholly singular or plural-- it's just that the attributes on either side are.  Similarly, you can't always look at a plural or singular attribute and decide whether it's part 2-way or 1-way association (you don't always have enough information)
+ A 1-way (or "exclusive") association is either a vialess collection attribute, or a singular attribute that is not pointed at by a via on the other side
+ A 2-way (or "shared") association is any collection attribute with `via`, or a singular attribute that _is_ pointed at by a via on the other side
+ A 2-way association that is laid out in such a way that it needs a junction model to fully represent it is called a many-to-many association
+ When referring to a record which might be populated, one calls it a "parent record" (or rarely: "primary record")
+ Finally, when referring to a populated key/value pair within a parent record, one refers to it as one of the following:
  + for singular, when not populated: a "foreign key"
  + for singular, when populated: a "child record" (aka "foreign record")
  + for plural, when populated: a "collection" (aka "foreign collection")


### Stage 3 query

> _aka "physical protostatement"_


Next, Waterline performs a couple of additional transformations:

+ replaces `method: 'findOne'` with `method: 'find'` (and updates `limit` accordingly)
+ replaces model attribute names with physical database attribute/column names
+ replaces the model identity with the table name
+ removed `populates` (or potentially replaced it with `joins`)
  + this varies-- keep in mind that sometimes _multiple physical protostatements will be built up and sent to different adapters_-- or even the same one.
  + if `joins` is added, then this would replace `method: 'findOne'` or `method: 'find'` with `method: 'join'`.

```js
{
  method: 'find', //<< note that "findOne" was replaced with "find"
  using: 'users', //<< the table name, it can be different than the model name, as it can be set in the model definition
  criteria: {
    select: [
      'id',
      'full_name', // << in this case full_name is the native database attribute/column name
      'age',
      'created_at'
    ],
    where: {
      and: [
        { occupation_key: 'doctor' }
      ]
    },
    limit: 2, //<< note that this was set to `2` automatically, because of being originally a "findOne"
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
      'created_at'
    ],
    where: {
      and: [
        { occupation_key: 'doctor' }
      ]
    },
    limit: 1,//<< note that this was STILL set to `1` automatically
    skip: 90,
    sort: [
      { full_name: 'ASC' }
    ],

    // If `method` is `join`, then join instructions will be included in the criteria:
    joins: [
      // The `joins` array can have 1 or 2 dictionaries inside of it for __each__ populated
      // attribute in the query. If the query requires the use of a join table then
      // the array will have two items for that population.
      {
        // The identity of the parent model
        parentCollectionIdentity: 'users',
        // The model tableName of the parent (unless specified all keys are using tableNames)
        parent: 'user_table_name',
        // An alias to use for the join
        parentAlias: 'user_table_name__pets',
        // For singular associations, the populated attribute will have a schema (since it represents
        // a real column).  For plural associations, we'll use the primary key column of the parent table.
        parentKey: 'id',
        // The identity of the child model (in this case the join table)
        childCollectionIdentity: 'pets_owners__users_pets',
        // The tableName of the child model
        child: 'pets_owners__users_pets',
        // An alias to use for the join. It's made up of the parent reference + '__' + the attribute to populate
        childAlias: 'pets_owners__users_pets__pets',
        // The key on the child model that represents the foreign key value
        childKey: 'user_pets',
        // The original model alias used
        alias: 'pets',
        // Determines if the parent key is needed on the record. Will be true for
        // singular associations otherwise false.
        removeParentKey: false,
        // Similar to removeParentKey
        model: false,
        // Flag determining if multiple records will be returned
        collection: true
      },
      // In this case the "pets" population requires the use of a join table so
      // two joins are needed to get the correct data. This dictionary represents
      // the connection between the join table and the child table.
      {
        // Parent in this case will be the join table
        parentCollectionIdentity: 'pets_owners__users_pets',
        parent: 'pets_owners__users_pets',
        parentAlias: 'pets_owners__users_pets__pets',
        parentKey: 'pet_owners',
        // Child will be the table that holds the actual record being populated
        childCollectionIdentity: 'pets',
        child: 'pets',
        childAlias: 'pets__pets',
        childKey: 'id',
        alias: 'pets',
        // Flag to show that a join table was used so when joining the records
        // take that into account.
        junctionTable: true,
        removeParentKey: false,
        model: false,
        collection: true,
        // Criteria to use for the child table.
        criteria: {
          where: {},
          limit: 9007199254740991,
          skip: 0,
          sort: [{
            id: 'ASC'
          }],
          select: ['createdAt', 'updatedAt', 'id', 'name']
        }
      }
    ]
  },
}
```


### Stage 4 query

> _aka "statement"_

**In future releases of Waterline and its core adapters, the concept of a Stage 4 query will likely be removed for performance reasons.**

In the database adapter, the physical protostatement is converted into an actual _statement_:

```js
{
  from: 'users',
  select: [
    'id',
    'full_name',
    'age',
    'created_at'
  ],
  where: {
    and: [
      { occupation_key: 'doctor' }
    ]
  },
  limit: 1,
  skip: 90,
  sort: [
    { full_name: 'ASC' }
  ]
}
```

This is the same kind of statement that you can send directly to the lower-level driver.  Statements are _much_ closer to native queries (e.g. SQL query or MongoDB native queries).  They are still more or less database-agnostic, but less regimented, and completely independent from the database schema.


> Not _every_ adapter necessarily uses statements (S4Qs) and native queries (S5Qs).  This will likely change in the future though.
> If you're implementing a new adapter for Waterline, take a peek at the latest versions of sails-postgresql or sails-mysql for inspiration.  If you need help, [hit us up](https://flagship.sailsjs.com/contact).


### Stage 5 query

> _aka "native query"_

In the database driver, the statement is compiled into a native query:

```js
SELECT id, full_name, age, created_at FROM users WHERE occupation_key="doctor" LIMIT 1 SKIP 90 SORT full_name ASC;
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

Quick reference for what various things inside of any given query are called.  (Some of these terms are formal and specific, and shouldn't come up in everyday use for most people contributing to Waterline.  Still, it's important to have names for things when discussing the finer details.)

> These notes are for the stage 2 and stage 3 queries-- but they are mostly applicable to stage 1 queries and stage 4 queries as well.  Just note that stage 1 queries tend to be much more tolerant in general, whereas stage 4 queries are more strict.  Also realize that the details of what is supported in criteria varies slightly between stages.
>
> + For more specific (albeit slightly older and potentially out of date) docs on criteria in stage 4 queries, see https://github.com/treelinehq/waterline-query-docs/blob/99a51109a8cfe5b705f40b987d4d933852a4af4c/docs/criteria.md
> + For more specific (albeit slightly older and potentially out of date) docs on criteria in stage 1 queries, see https://github.com/balderdashy/waterline-criteria/blob/26f2d0e25ff88e5e1d49e55116988322339aad10/lib/validators/validate-sort-clause.js and https://github.com/balderdashy/waterline-criteria/blob/26f2d0e25ff88e5e1d49e55116988322339aad10/lib/validators/validate-where-clause.js


| Word/Phrase            | Meaning |
|:-----------------------|:------------------------------------------------------------------------------|
| query key              | A top-level key in the query itself; e.g. `criteria`, `populates`, `newRecords`, etc.  There are a specific set of permitted query keys (attempting to use any extra keys will cause errors!  But note that instead of attaching ad hoc query keys, you can use `meta` for custom stuff.)
| `using`                | The `using` query key is a vocative that indicates which model is being "spoken to" by the query.
| clause                 | A top-level key in the `criteria`.  There are a specific set of permitted clauses in criterias.  Which clauses are allowed depends on what stage of query this is (for example, stage 3 queries don't permit the use of `omit`, but stage 2 queries _do_)
| `sort` clause          | When fully-normalized, this is an array of >=1 dictionaries called comparator directives.
| comparator directive   | An item within the array of a fully normalized `sort` clause.  Should always be a dictionary with exactly one key (known as the _comparator target_), which is usually the name of an attribute (or column name, if this is a stage 3 query).  The RHS value for the key in a comparator directive must always be either 'ASC' or 'DESC'.
| `where` clause         | The `where` clause of a fully normalized criteria always has one key at the top level: either (1) a predicate ("and"/"or") whose RHS is an array consisting of zero or more conjuncts or disjuncts, or (2) a single constraint (see below)
| conjunct               | A dictionary within an `and` array.  When fully normalized, always consists of exactly one key-- an attribute name (or column name), whose RHS is either (A) a nested predicate operator or (B) a filter.
| disjunct               | A dictionary within an `or` array whose contents work exactly like those of a conjunct (see above).
| scruple                | Another, more general name for a dictionary which could be a conjunct, disjunct, or the very top level of the `where` clause.  A scruple could contain either a _constraint_ or a _predicate_. (This terminology is particularly useful when talking about a stage 1 query, since not everything will have been normalized yet.)
| predicate              | A _predicate scruple_ (usually simply called a _predicate_) is a lone key/value pair whose LHS is a _predicate operator_ (either "and" or "or") and whose RHS is a _predicate set_.
| predicate operator     | The LHS of a predicate scruple ("and" or "or") is called a _predicate operator_.  (Sometimes also informally known as a _predicate key_.)
| predicate operands     | The RHS of a predicate scruple is an array of _predicate operands_.  Its items are scruples called either "conjuncts" or "disjuncts", depending on whether the predicate operator is an "and" or an "or", respectively.
| constraint             | A _constraint scruple_ (usually simply called a _constraint_) is a key/value pair that represents how values for a piece of data will be qualified.  Once normalized, the RHS of a constraint is always either a primitive (making it an _equivalency constraint_) or a dictionary consisting of exactly one key/value pair called a "modifier" aka "sub-attribute modifier" (making the constraint a _complex constraint_).  In certain special cases, (in stage 1 queries only!) multiple different modifiers can be combined together within a complex constraint (e.g. combining `>` and `<` to indicate a range of values).  In stage 2 queries, these have already been normalized out (using `and`).
| constraint target      | The LHS of a constraint is called the _constraint target_.  Usually, this is the name of a particular attribute in the target model (or column in the target table, if this is stage 3).
| constraint modifier    | A _complex constraint modifier_ (or simply a _modifier_) is a key/value pair within a complex constraint, where the key is one of a special list of legal operators such as `nin`, `in`, `contains`, `!`, `>=`, etc.  A modifier impacts how values for a particular attribute name (or column name) will be qualified.  The data type for a particular modifier depends on the modifier.  For example, a modifier for key `in` or `nin` must be an array, but a modifier for key `contains` must be either a string or number.


```javascript
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



### Example of iterating over a `where` clause from the criteria of a stage 2 query

See https://gist.github.com/mikermcneil/8252ce4b7f15d9e2901003a3a7a800cf.



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

That's an error (i.e. in waterline-schema).




## Required vs allowNull vs. defaultsTo vs. autoCreatedAt vs. autoUpdatedAt

Though relatively simple from the perspective of userland, this gets a bit complicated internally in Waterline.

For details, see https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1814738146




## Errors

| Error `name`            | Meaning                                                        |
|:------------------------|:---------------------------------------------------------------|
| UsageError              | Bad usage, caught by Waterline core                            |
| AdapterError            | Something went wrong in the adapter (e.g. uniqueness constraint violation)    |
| PropagationError        | A conflict was detected while making additional, internal calls to other model methods within Waterline core (e.g. `replaceCollection()` could not update a required null foreign key, or a conflict was encountered while performing "cascade" polyfill for a `.destroy()`)   |
| _anything else_         | Something unexpected happened     |






