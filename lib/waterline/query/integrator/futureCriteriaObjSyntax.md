```javascript
/*


Dog.find()
  .whose('owner', { age: { '>=': 45}})
  .populate('owner');

{
  where: {
    foo: 'asdf',
    owner: {
      age: { '>=': 45 }
    },
  },
  select: [],
  joins: [{
    parent: 'person'
    parentKey: 'person'
    child: 'person'
    childKey: ''
  }]
}

var Q0 = (SELECT Person.pk FROM Person WHERE age >= 45);
var Q1 = SELECT * FROM Dog WHERE Dog.ownerFK IN Q0;
var Q2 = SELECT * FROM Person WHERE Person.pk IN (Q1)

People with age >= 45 and populate the dog which is associated with each of them.
(SELECT * FROM Person WHERE age >= 45) INNER JOIN Dog ON Dog.id=Person.dog_id WHERE foo='asdf';


// Recursive joins

where: {
    foo: 'asdf',
    owner: {
      where: {
        age: { '>=': 45 }
      },
      select: '*',
      joins: [{}]
    },
  },
  select: [],
  joins: [{
    parent: 'person'
    parentKey: 'person'
    child: 'person'
    childKey: ''
  }]


*/
```