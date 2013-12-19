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


MessageUser
========================================================================
  | _message_a  | _user_b  | _relation_a_to_b
========================================================================
  | 30          | 1        | 'to'     
  | 30          | 1        | 'cc'     
  | 30          | 1        | 'bcc'    


UserUser
========================================================================
  | _user_a  | _user_b  | _relation_a_to_b
========================================================================
  | 88       | 42       | 'followers'     
  | 88       | 43       | 'followers'     
  | 88       | 65       | 'followers'     
  | 88       | 42       | 'following'     
  | 42       | 2        | 'followers'     
  | 65       | 21       | null          









Unidirectional relation:
1..N

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

    * "subjectively (relationship data is 1-way)
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

or

Objective, 2-way, `through`
==============================
Message: [to.through(send), cc.through(send), bcc.through(send)] 
User: [sentMessages.through(send), cc.through(send), bcc.through(send)] 
Send: []






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

// Find all users, and also include their friends whose names start with "joe"
User.find()
  .populate('friends', {name: { 'startsWith': 'joe' }})

// Find all users with friends whose names start with "joe"
// (see https://github.com/balderdashy/waterline/issues/176)
User.find()
  .where({ friends: {??????} })

// Find all users with at least 30 friends
// (see https://github.com/balderdashy/waterline/issues/176)
User.find()
  .where({ friends: {??????} })

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




//////////////////////////////////////////////////////////////////////////////////////////
// Probably bad ideas:
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