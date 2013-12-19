/*
Thoughts:

sends (join table)

Option A
============================================================
  | message_id | to    | cc     | bcc
============================================================
  | 30         | 1     | null   | null
  | 30         | null  | 1      | null



Named associations could be treated as implicit `through` attributes:


Option B
============================================================
  | message_id | user_id | to    | cc     | bcc
============================================================
  | 30         | 1       | true  | false  | false
  | 30         | 1       | false | true  | false



OR even more simply, a single implicit enum attribute:


Option C
========================================================================
  | _message_id | _user_id | _message_relationship | _user_relationship
========================================================================
  | 30          | 1        | 'to'                  | null
  | 30          | 1        | 'cc'                  | null
  | 30          | 1        | 'bcc'                 | null



And to further normalize the column names using the same approach



Option D

MessageUser
========================================================================
  | _message_a  | _user_b  | _message_a_relation | _user_b_relation
========================================================================
  | 30          | 1        | 'to'                | null
  | 30          | 1        | 'cc'                | null
  | 30          | 1        | 'bcc'               | null


UserUser
========================================================================
  | _user_a  | _user_b  | _user_a_relation | _user_b_relation
========================================================================
  | 88       | 42       | 'followers'      |  null
  | 88       | 43       | 'followers'      |  null
  | 88       | 65       | 'followers'      |  null
  | 88       | 42       | 'following'      |  null
  | 42       | 2        | 'followers'      |  null
  | 65       | 21       | 'following'      |  null


// Schema
followers: {
  collection: 'user'
}
follows: {
  collection: 'user'
}

// JSONy data
{
  id: 88,
  name: 'Mike',
  followers: [42, 43, 65],
  following: [42]
}

{
  name: 'Rachael',
  id: 42,
  followers: [2],
  following: []
}

{
  name: 'Cody',
  id: 65,
  followers: [21],
  following: []
}




Option E

Finally, a further possible simplification-- why store `_user_b_relation` at all?

Relationships always have a component which is one-way-- it's just that you need to reference them from both sides sometimes.


{

  favoriteMessages: {  collection: 'message' }
}

message_user
========================================================================
  | _message_a  | _user_b  | _relation_a_to_b  | _direction_a_to_b?
========================================================================
  | 30          | 1        | 'to'              | true
  | 30          | 1        | 'cc'              | true
  | 30          | 1        | 'bcc'             | true
  | 30          | 1        | 'favoriteMessages'| false


pizza_topping
========================================================================
  | _pizza_a   | _topping_b   | _relation_a_to_b
========================================================================
  | 88         | 9            | 'topCuddliestPets'     
  | 88         | 2            | 'topCuddliestPets'     
  | 88         | 1            | 'topCuddliestPets'     

  | 88         | 2            | 'topUgliestPets'
  | 42         | 2            | 'followers'

  | 65         | 21           | null      





user_user
========================================================================
  | _user_a  | _user_b  | _relation_a_to_b
========================================================================
  | 88       | 42       | 'followers'     
  | 88       | 43       | 'followers'     
  | 88       | 65       | 'followers'     
  | 88       | 42       | 'following'     
  | 42       | 2        | 'followers'     
  | 65       | 21       | null          







Option F

Probably the best one-- makes it easy to jump from this unidirectional join table to a "through" table with more attributes.

message_to_user
===========================
  | message_id  | user_id  
===========================
  | 30          | 1

message_cc_user
===========================
  | message_id  | user_id  
===========================
  | 30          | 1

message_bcc_user
===========================
  | message_id  | user_id  
===========================
  | 30          | 1


user_favoriteMessages_messages
===========================
  | user_id  | message_id  
===========================
  | 1        | 30





Unidirectional relations
1..N

Person
{
  father: {model: 'person'},
  mother: {model: 'person'},
  currentPet: {model: 'pet'},
  bankAccounts: {collection: 'bankAccount'},
  children: {collection: 'person'}
}

  .__________________.
  |_(n)_> Person (1)_| [children]


*** one-to-one ***
If a person has a "memory" of her father, it would need to be stored in a "through" table:
Person -(1 father)-> PersonMemory -(1)-> Person
If a person has a "memory" of her current pet, it would need to be stored in a "through" table:
Person -(1 currentPet)-> PetMemory -(1)-> Pet

*** one-to-many ***
If a person has a "memory" for one or more of her children, it would need to be stored in a "through" table:
Person =(n children)=> PersonMemory -(1)-> Person

*** many-to-many ***
If a person makes a "withdrawal" from one of her bank accounts, it would need to be stored in a "through" table:
(since we don't know if other people can own the bank account or not yet)
(we also make the assumption that BankAccount is a concrete account, not a metaphorical "BankAccount" class)
Person =(n bankAccounts)=> BankAccountsTransaction -(1)-> BankAccount


Bidirectional relations
N..N
  * Data exists in either model (User has `name: 'Louise'`, Course has `maxEnrollment: 150`)

  * Relationship-specific data doesn't have to exist:

      User   {  courses: { collection: 'course' }  }
      Course {  users:   { collection: 'user' }  }


  - but if it does, it can exist either: -

    * "objectively" (relationship data stands alone on its own)
      e.g.:

      * User enrolled in Course on `June 1, 2013`
      * and ended up with a `B+` for her grade
      * User gave the Course a 1/5 rating
      * and left a comment on `Dec 1, 2013`)
      
      User   {  courses: { collection: 'courses', through: 'Enrollment' }  }
      Course {  users: { collection: 'users', through: 'Enrollment' }  }
      Enrollment {  user: { model: 'user' }, course: { model: 'course' }, grade: 'B+', createdAt: 'June 1, 2013', rating: '1/5', comment: {Comment} }

    - or -

    * "subjectively (relationship data is 1-way + unordered)
      e.g.:

      * User has a collection of Courses called "enrolledIn":
        (there's no physical back-reference from Course to User)

          User   {  enrolledIn: { collection: 'course' }  }
          Course {}

      * Course has "enrolledUsers" which is a collection of Users:
          (there's no physical back-reference from User to Course)
      
          User   {}
          Course {  enrolledUsers: { collection: 'user' }  }


      * Course has "enrolledUsers" AND "teachingAssistants":
          (there's no physical back-reference from User to Course-- we don't know HOW a user is associated from its side)

          User   { }
          Course {  enrolledUsers: { collection: 'user' }, teachingAssistants: { collection: 'user' }  }


      * Message has "to" AND "cc" AND "bcc" AND "from"
          (with no back-reference)

          Message
          {
            to: { collection: 'user' },
            cc: { collection: 'user' },
            bcc: { collection: 'user' },
            from: { model: 'user' }
          }

          User      {}

      * Message has "to" AND "cc" AND "bcc" AND "from"
          (Finally a back-reference!!)

          Message
          {
            to: { collection: 'user' },
            cc: { collection: 'user' },
            bcc: { collection: 'user' },
            from: { model: 'user' }
          }

          User
          {
            sentMessages: { collection: 'message', via: 'from' }
          }

      * Message has "to" AND "cc" AND "bcc" AND "from"
        (this time we'll go crazy w/ backreferences-- they are always virtual!)

        Message
        {
          to: { collection: 'user' },
          cc: { collection: 'user' },
          bcc: { collection: 'user' },
          from: { model: 'user' }
        }

        User
        {
          sentMessages: { collection: 'message', via: 'from' }
        }




"Subjective" (1-way) relationship data can always be modeled in an "objective" fashion (join-through model).
But at this time, you cannot combine 'via' (subjective, 1-way) with 'through' (objective, bidirectional)--
you've got to pick one or the other.  If you're not sure, go objective!  It's more flexible, but less concise.
At the end of the day, you have to ask yourself-- what design will work better for the *** realistic *** scope/use case of my app's data model?


Recap:


Subjective, 1-way, `via`
==============================

Message: [to, cc, bcc, from]
User: [:sentMessages, :receivedMessages]

there's no extra data that lives in the gaps of `sentMessages`
and `receivedMessages`-- the order users are entered into the
"To:" field for a message is not remembered.


or

Objective, 2-way, `through`
==============================
Message: [to.through(send), cc.through(send), bcc.through(send)] 
User: [sentMessages.through(send), cc.through(send), bcc.through(send)] 
Send: []

Extra data could exist in the `send` model.  Any of a `send`s
attributes could be sorted on.




Data 


In self-associations, either side could "initiate" the relationship (do you "belong to" or "own" your spouse?)
but the semantics are the same-- same thing for many-to-many self associations (do you "belong to many" friends or "own many" friends?)

// Person
{
  // Associations
  spouse: {Person},
  parents: [Person],
  friends: [Person],
  enemies: [Person],
  usableBankAccounts: [BankAccount],
  favoritePet: {Pet},


  // Back-references ("virtual associations")
  ("spouseOf": [Person])          ( 1..1.. but really the same as 1..N-- could be the spouse of more than one person!!)
  ("parentOf": [Person])          ( 1..N: could be the friend of more than one person!!)
  ("friendsWith": [Person])       ( N..N: could be the friend of more than one person!!)
  ("enemies": [Person])       ( N..N: could be the friend of more than one person!!)
}

// BankAccount
{
  // Associations
  bank: {Bank}

  // Back-references ("virtual associations")
  ("bankAccountOf": [Person])     (could be the bank account of more than one person!!)
}

// Course
{
  // Associations

  // Back-references
  ("course")
}

// Pet
{
  // Associations

  // Back-references ("virtual associations")

  ("favoritePet::of": [Person])     (could be the favorite pet of more than one person!!)
}





Student
{
  // Bad: these are not fully descriptive.
  courses: [Course],
  firefighters: [Person],

  // Sometimes solvable by bundling more information in the name of the association:
  coursesEnrolled: [Course]

  enrolledInCourses: {
    through: 'enrollment',
    collection: 'course'
  }
}

Course
{
  (user :: [User] via:enrolledIn)
}


// but in some cases, you'll want to use a join-through model to store more information:

User
{
  (user :: [User] via:enrolledIn)
}

Course
{
  (user :: [User] through:enrollment)
}

Enrollment
{
  
}







??????????????????????????????????????????????????????????????????????
Some other thoughts..
??????????????????????????????????????????????????????????????????????

// Musings on back-references::

// 1..1 self-association
User.find()
  .which({
    is:'spouse',
    of: 'User'
  })

// Find Larry's husband:
User.find()
  .of('User', { name: 'larry' })
  .via('spouse');

// or more traditionally:
User.findOne({name: 'larry'})
  .populate('spouse');  // and then grab Larry's husband from the result

// or perhaps the most concise (like a 'pluck')
// (this only works if spouse is stored as 1-way {spouse: {model: 'user'}}, aka 1..1, e.g. `'state' !== Uta.... err nevermind)
User.find()
  .where('spouse': { name: 'larry' })




// Find Larry's favoritePets:
User.findOne({ name: 'larry'} )
  .populate('favoritePets');  // and then grab Larry's favoritePets from the result

// Use the implicit back-reference (if `via` is omitted, this returns the union of all of larry's associated pets which could possibly be back-referenced)
Pet.find()
  .of('User', { name: ''})
  .via('pets');



// Find all users whose spouse's name starts with 'larry':
User.find()
  .of('User', { name: 'larry' })
  .via('spouse');


// 1..N self-association
User.find()
  .who({
    is:'spouse',
    of: 'User'
  })

User.find()
  .who({
    are: 'enrolledIn',
    of: 'Course'
  })


// Find all users, and include their friends
User.find()
  .populate('friends'})

// Find all users, and also include the first 5 of their friends whose names start with "joe" (sort those friends alphabetically)
User.find()
  .populate('friends', {name: { 'startsWith': 'joe' }}, {}, 5, 'name ASC' )

// Find all users with friends whose names start with "joe"
// (read: with at least one friend whose name starts w/ "joe")
// (see https://github.com/balderdashy/waterline/issues/176)
User.find()
  .withAtLeast(1, 'friends', { name: { startsWith: 'joe' } };

// Find all users with at least 30 friends
// (see https://github.com/balderdashy/waterline/issues/176)
User.find()
  .withAtLeast(30, 'friends');

// Others:
.withNoMoreThan(30, 'friends');
.withExactly(30, 'friends');

// Shortcuts:
.withNo('friends') === .withExactly(0, 'friends')
.with('friends') === .withAtLeast(1, 'friends');


// General Purpose: (all queries get compiled into monolihic object like this)

// Find the name, treatPreference, and `happinessIndex` of dogs with family members whose average age is >= 45
// sorted by name, Z-A
Dog.find({
  where: {
    familyMembers: {
      '!AVERAGE: {
        age: { '>=': 45 }
      }
    }
  },
  select: ['name', 'treatPreference', 'happinessIndex'],
  sort: 'name DESC'
})


// Shortcut for the query above: [  .whose() === "sub-WHERE" query  ]
Dog.find()
  .whose('familyMembers', {
    '!AVERAGE(age)': { '>=': 45 }
    }
  })
  .select('name', 'treatPreference', 'happinessIndex')
  .sort('name DESC')


// A bit simpler now-- we want all of the dogs whose `owner` is older than 45:
Dog.find()
  .whose('owner', {
    age: { '>=': 45 }
  })




// Finally let's do some pivot analysis or something..


// Average happinessIndex for dogs, grouped by age cohort (in dog years)
Dog.groupBy('age')
  .select('!AVERAGE(happinessIndex)', 'age');


// Average happinessIndex for dogs, grouped by #(count) of familyMembers younger than 25
// and sort the groups by average happinessIndex
//
// (group-by subquery, plus aggregation)
Dog.groupBy({
  familyMembers: {
    select: '!COUNT',
    where: {
      age: { '<=': 25 }
    }
  }
})
.select('!AVERAGE(happinessIndex)', '*')    // here * means all the other basic Dog attributes--> but how do we get the cohort?
.sort('!AVERAGE(happinessIndex) ASC');

// Same thing-- lets make it easier to read this time though w/ `groupByAs()`
Dog.groupByAs('numFamilyMembersUnder25', {
  familyMembers: {
    select: '!COUNT',
    where: {
      age: { '<=': 25 }
    }
  }
})
.select('!AVERAGE(happinessIndex)', 'numFamilyMembersUnder25', '*')
.sort('!AVERAGE(happinessIndex) ASC');




// Let's do some simpler selections:

// Find all the dogs, and get all their info (except their barkPassword), but also get their owner's name and age:
Dog.find()
  .populate('owner', {}, ['name', 'age'])
  .omit('barkPassword')


// Find all the dogs' names and ages, but also get their caretakers' names and ages:
//
// e.g.:
// [{
//  name: 'Sparky',
//  age: 11,
//  caretakers: [{
//    name: 'Sandy',
//    age: 45
//  }, ...]
// }, ...]

Dog.find()
  .select('name', 'age')
  .populate('caretakers', {}, ['name', 'age'])




// Same as above, but this time we want all their caretakers' information, except their `bedtime`

Dog.find()
  .select('name', 'age')
  .populate('caretakers', {
    omit: 'bedtime'
  })





// Let's do simple aggregations:
// (note: you can drop the .find() here)

// How many dogs do we have in the db total?
// === Dog.count()
Dog.select('!COUNT')

// Average age of all our dogs
// === Dog.average('age')
Dog.select('!AVERAGE(age)')

// More verbose
Dog.select({
  '!AVERAGE': 'age'
})



// Average weight of our dogs' owners:
// (each dog has one owner)
Dog.select({
  '!AVERAGE': {
    owner: {
      weight: 
    }
  }
})

// Average weight of our dogs' caretakers:
// (each dog could have many caretakers)
Dog.select({
  '!AVERAGE': 'caretakers'
})


// Find all users with a favorite pet whose name is "Hamlet"
User.find()
  .where({ favoritePet: { name: 'Hamlet'} })

// Find all users with a favorite pet whose name is "Hamlet", and populate the pet.
User.find()
  .where({ favoritePet: { name: 'Hamlet'} })
  .populate('favoritePet')

// Find all users with a favorite pet whose name is "Hamlet", and populate the pet, but only grab the pet's name, age, and breed.
User.find()
  .where({ favoritePet: { name: 'Hamlet'} })
  .populate('favoritePet', {}, {name: 1, age: 1, breed: 1})


// Find all users
//  * with a favorite pet whose name is "Hamlet"
//  * populate the pet
//  * select the pet's name, age, and breed
//  * sort by pet's age, descending
User.find()
  .where({ favoritePet: { name: 'Hamlet'} })
  .populate('favoritePet', {}, {name: 1, age: -1, breed: 1})

// Find all users
//  * with friends whose names are "joe"
//  * populate the friends
//  * but limit the number of friends to 30
User.find()
  .where({ friends: { name: 'joe' } })
  .populate('friends', {}, {}, 30);








// New stuff:





// .select()
//
// limit attributes
//
Foo.select('attr0', 'attr1', ..., 'attrN')



// .populate()
//
// "deep" select-- can fetch subsets of associated collections/models, 
// including limit, skip, sort, and so forth.  Necessary to "unfold"
// assocations.  Can be used recursively in `subQuery`, but only w/
// monolithic query syntax.
//
Foo.populate('attribute' [, subQuery])


// .whose()
//
// shortcut for {where: { oneOfMyAssociations: subQuery }}
//
Foo.whose('attribute', subQuery)



// .with*()
//
// shortcuts for WHERE subqueries (usually where you'd have to filter 
// based on aggregations in populated associations).
//
Foo.with('attribute' [, subQuery])
Foo.withAtLeast(30, 'attribute' [, subQuery])
Foo.withExactly(2, 'attribute' [, subQuery])
Foo.withNo('attribute' [, subQuery])
Foo.withNoMoreThan(15, 'attribute' [, subQuery])



// e.g.:
Dog.with('caretakers')

// is equivalent to this explicit subquery usage:
Dog.find()
  .where({
    caretakers: {
      '!COUNT': {}
    }
  })

// and also:
Dog.find()
  .whose('caretakers', {
    '!COUNT': {}
  })



// .groupBy('attribute')
// .as('virtualAttribute')
//
// Allows you to name nasty groupBy cohorts and make them easier to work w/.
//
Dog.groupBy('caretakers.!AVERAGE(age)').as('average age of caretakers')




//
//
// .groupBy(selectionOperation)
//
//

// BTW here's a simpler groupBy:
Taxpayer.groupBy('taxBracket')

// and one in the middle:
Dog.groupBy('owner.age')

// and one on the harder side: (but still easier than a subquery)
Dog.groupBy('caretakers.!AVERAGE(age)')




// .groupBy('attribute' [, subQuery])
//
// Group by w/ subquery (the subquery will run on each matched Dog in order to calculate the virtual attribute-- same as putting it in a select)
//
// (aside:  groupBy with subqueries only works on 1..N or N..N associations-- doesn't make sense otherwise)
Dog.groupBy({
  caretakers: {
    select: '!COUNT',
    where: {
      age: { '<=': 25 }
    }
  }
})
.as('the number of this dog\'s caretakers who are older than 25')
.select('the number of this dog\'s caretakers who are older than 25', '*')







// .having()
//
// Allows you to filter cohorts (the "groups" in our groupBy queries)
// from the final result set.
//


// Example:
//
// Get tax brackets with more than 300,000 taxpayers.




// .populate('attribute' [, subQuery])
// .as('virtualAttribute')

// .select('attribute')
// .select('attribute' [, selectionOperation])
// .select('attribute' [, subQuery])
//
//
// Allows you to filter cohorts (the "groups" in our groupBy queries)
// from the final result set.
//



// Integrating all of it!
//
// For each tax bracket with more than 300,000 taxpayers,
// calculate the total number of taxpayers and the average $ amount
// in those taxpayers' primary savings account at the end of the year.

Taxpayer
  .groupBy('taxBracket').as('bracket')
  .having({
    '!COUNT()': {
      '>': 300000
    }
  })
  .populate('primarySavingsAccount', {}, '!AVERAGE(endOfYearBalance)')
  .as('')
  .select('!COUNT()')





// final note-- could probably pull out the concept of 'as()' and reserve it for `populate` and `select`
// we could just force groupBy to always use the virtual attributes (not allowed to do subqueries in a groupBy)













//////////////////////////////////////////////////////////////////////////////////////////
// Probably bad ideas: (but kept here for reference / scratch paper)
// 1..1 self-association
User.find()
  .who({
    is:'spouse',
    of: 'User'
  })


// 1..N self-association
User.find()
  .who({
    is:'spouse',
    of: 'User'
  })

User.find()
  .who({
    are: 'enrolledIn',
    of: 'Course'
  })

*/



