

## Expected format of join instructions

```javascript
// A join instruction object
{

    // join SELECT/projection to perform on joined results
    // includes all attributes of child collection by default--
    // e.g. populate('friends') -> might result in:
    // [ 'name', 'email', 'age', 'favoriteColor', 'id' ]
    //
    // In the future, it may also be overridden, e.g.:
    // populate('friends', { select: ['name', 'favoriteColor'] } ))
    // -> might result in:
    select: ['name', 'favoriteColor'],

    // join subcriteria-- (e.g. populate('friends', { age: { '>' : 40 } } ))
    // this is expected to be handled by the individual queries themselves
    where: { age: { '>' : 40 } },

    // limit, skip, and sort are expected to be handled by the individual queries themselves
    // other options--
    // e.g. populate('friends', {limit: 30, skip: 0, sort: 'name ASC' })
    limit: 30,
    skip: 0,
    sort: 'name ASC'

    // Existing alias, parent/child key and table name data:
    alias: 'friends',  // the `alias`/ name of association-- (e.g. populate('friends') )
    parent: 'message',  // left table name
    parentKey: 'id',      // left table PK -OR- left table FK -> right table
    child: 'message_to_user',  // right table name
    childKey: 'message_id'     // right table PK -OR- right table's FK -> left table
}
```
