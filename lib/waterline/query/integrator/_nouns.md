#On Nouns:

> Why is this here?  To study cascading and soft deletes.
> Curious how they're related?  Read on.
>
> The most important part is at the bottom-- we hone in on the difference between "concrete nouns" (or tokens) and "abstract nouns" (or types / classes).
>
> See, the thing is, you can have an instance of a class AND an instance of a token.  But the problem is they are often named exactly the same :)
>
> Consider:
>
> + the color `red`
> + the colors of the crayons in any crayon box
> + the colors of the crayons in a particular brand of crayon box
> + the `red` colors of the crayons in a particular crayon box
>   + the `color` of a particular crayon in the aforementioned collection
>
> In every case, the color never actually exists- it only exists through relationships.
>
> + the `dog` (Platonic ideal)   === Class (i.e. Relational Model)
> + the `dogs` (down the street) === Backbone.Collection
>   + the `dog` (one of the dogs down the street)   === Backbone.Model
>
> 


+ Person(s)
+ Place(s)
+ Thing(s)
+ Idea(s)

> thanks to "Grammaropolis" (http://grammaropolis.com/noun.php)




### common noun
  - names a general person, place, thing, or idea
  e.g. -> lady, restaurant, volcano






### proper noun
  - specific person, place, thing, or idea
  -> Krakatoa, Burger King, Lucy






### concrete noun
  - person, place, or thing
  - perceptible at least one of the 5 senses

  e.g. -> receptionist, platypus, dentist




  Countable Concrete Nouns
  + orange
  + desk
  + book
  + car
  + house
  etc.

  Uncountable Concrete Nouns
  + rice
  + water
  + pasta
  + whiskey
  etc.







### abstract noun
  - An abstract object is an object which does not exist at any particular time or place, but rather exists as a type of thing, i.e. an idea, or abstraction.
  
  e.g. -> honor, courage






### collective noun
  - a noun modifer, anything used like:
        "[[COLLECTIVE_MODIFIER]] of..."
  e.g. -> `school` (of fish), `squad` (of police)
       -> plethora, army, team, group, cast, crowd, firm, department


No exact equivalent




### compound noun
  - singular noun which forms a group
  -> swimming pool, shortcakes, mother-in-law



MotherInLaw
Can be factored:

MotherInLaw ----> Person
             |
             |--> Relationship




### nominalization

an abstract query on a model which results in a database "view" or subset can be thought of as a "nominalization", caching the value of some query:

http://en.wikipedia.org/wiki/Nominalization

(they must be countable to use w/ a database)

e.g.
`the poor`
Person.find({ income: { '<=': threshold }})










### ontology


http://en.wikipedia.org/wiki/Ontology



Examples of abstract and concrete objects
Abstract  Concrete
Tennis  A tennis game
Redness The red coloring of an apple
Five  Five cats
Justice A just action
Humanity (the property of being human)  Humanity (the human race)



##### Abstract Object Theory

"An Introduction to Axiomatic Metaphysics" is the title of a publication by Edward Zalta that outlines abstract object theory.

On Zalta's account, some objects (the ordinary concrete ones around us, like tables and chairs) "exemplify" properties, while others (abstract objects like numbers, and what others would call "non-existent objects", like the round square, and the mountain made entirely of gold) merely "encode" them.

  - For every set of properties, there is exactly one object that encodes exactly that set of properties and no others.
  - This allows for a formalized ontology.

More on "Abstract Object Theory"   (http://en.wikipedia.org/wiki/Abstract_object_theory)



##### Problem: "type-token ambiguity"



####### Pierce's Type-Token Distinction

> In order that a Type may be used, it has to be embodied in a Token which shall be a sign of the Type, and thereby of the object the Type signifies.
> – Peirce 1906, Ogden-Richards, 1923, 280-1.

Type/Form:   letter
(a collection of the platonic ideals of letters like "A", "B", and "Z")

Token/Inscription:  letter
(a particular instance of a letter type "A", "B", etc.)

There are only 26 letters in the English alphabet and yet there are more than 26 letters in this sentence. Moreover, every time a child writes the alphabet 26 new letters have been created.

The letters that are created by writing are physical objects that can be destroyed by various means: these are letter TOKENS or letter INSCRIPTIONS. The 26 letters of the alphabet are letter TYPES or letter FORMS.



Peirce's type-token distinction, also applies to words, sentences, paragraphs, and so on: to anything in a universe of discourse of character-string theory, or concatenation theory.[2] There is only one word type spelled el-ee-tee-tee-ee-ar,[3] namely, ‘letter’; but every time that word type is written, a new word token has been created.

Some logicians consider a word type to be the class of its tokens. Other logicians counter that the word type has a permanence and constancy not found in the class of its tokens. The type remains the same while the class of its tokens is continually gaining new members and losing old members.


See the "Problem of Universals" (http://en.wikipedia.org/wiki/Problem_of_universals) and "Platonic Form" (http://en.wikipedia.org/wiki/Platonic_form)


*Occurrences of Numerals*

http://en.wikipedia.org/wiki/Occurrences_of_numerals

Numerals—strings of characters called digits—are types not tokens, using Pierce's type-token distinction. Written tokens of numerals are visible and can be destroyed: erased, eradicated, incinerated, and so on.

In senses used in this article, there are exactly ten digits—0,1, …, 9—, each a one-digit numeral.  All longer numerals are concatenations of shorter numerals, where ‘concatenation’ is used in the sense of concatenation theory or string theory.

What is “an occurrence”? As detailed in various places including the Wikipedia article type-token distinction, some authors have accepted as answer The Prefix Proposal that a given occurrence of a numeral in a given numeral be identified with the initial sub-numeral ending with the given occurrence. This means that the first occurrence of 12 in 12312 is 12 itself and the second occurrence of 12 in 12312 is 12312 itself. It further means the first occurrence of 12 in 12312 occurs in the second occurrence of 12 in 12312. Finally, it means that the length of an occurrence of a numeral depends on the numeral it occurs in and its order of occurrence: the first occurrence of 12 in 12312 is a two-digit numeral whereas the second occurrence of 12 in 12312 is a five digit-numeral.



*More examples:*

You may show someone the bicycle in your garage, but you cannot show someone "The bicycle". Tokens always exist at a particular place and time and may be shown to exist as a concrete physical object.

If we say that two people "have the same car", we may mean that they have the same type of car (e.g. the same brand and model), or the same particular token of the car (e.g. they share a single vehicle).

Although this flock is made of the same type of bird, each individual bird is a different token.


  - See http://en.wikipedia.org/wiki/Type-token_distinction

  - See http://en.wikipedia.org/wiki/Pierce%27s_type-token_distinction
  - See http://en.wikipedia.org/wiki/Mathematical_universe_hypothesis
  
  - See http://en.wikipedia.org/wiki/Abstract_object#Concrete_and_abstract_thinking







### Knowledge Representation

http://en.wikipedia.org/wiki/Knowledge_representation

Knowledge representation (KR) research involves analysis of how to reason accurately and effectively and how best to use a set of symbols to represent a set of facts within a knowledge domain.

A key parameter in choosing or creating a KR is its expressivity. The more expressive a KR, the easier and more compact it is to express a fact or element of knowledge within the semantics and grammar of that KR. However, more expressive languages are likely to require more complex logic and algorithms to construct equivalent inferences. A highly expressive KR is also less likely to be complete and consistent. Less expressive KRs may be both complete and consistent.

##### Abstract background:
http://en.wikipedia.org/wiki/Autoepistemic_logic
http://en.wikipedia.org/wiki/Stable_model_semantics



##### Expressivity
http://en.wikipedia.org/wiki/Expressivity_(computer_science)


Database theory is concerned, among other things, with database queries, e.g. formulas that given the contents of a database extract certain information from it. In the predominant relational database paradigm, the contents of a database are described as a finite set of finite mathematical relations; Boolean queries, that always yield true or false, are formulated in first-order logic.

It turns out that first-order logic is lacking in expressive power: it cannot express certain types of Boolean queries, e.g. queries involving transitive closure. However, adding expressive power must be done with care: it must still remain possible to evaluate queries with reasonable efficiency, which is not the case, e.g., for second-order logic. Consequently, a literature sprang up in which many query languages and language constructs were compared on expressive power and efficiency, e.g. various versions of Datalog.[6]

Similar considerations apply for query languages on other types of data, e.g. XML query languages such as XQuery.


##### Relational Model

Most research work has traditionally been based on the relational model, since this model is usually considered the simplest and most foundational model of interest. Corresponding results for other data models, such as object-oriented or semi-structured models, or, more recently, graph data models and XML, are often derivable from those for the relational model.

http://en.wikipedia.org/wiki/Relational_model

A data type as used in a typical relational database might be the set of integers, the set of character strings, the set of dates, or the two boolean values true and false, and so on. The corresponding type names for these types might be the strings "int", "char", "date", "boolean", etc. It is important to understand, though, that relational theory does not dictate what types are to be supported; indeed, nowadays provisions are expected to be available for user-defined types in addition to the built-in ones provided by the system.

Attribute is the term used in the theory for what is commonly referred to as a column. Similarly, table is commonly used in place of the theoretical term relation (though in SQL the term is by no means synonymous with relation). A table data structure is specified as a list of column definitions, each of which specifies a unique column name and the type of the values that are permitted for that column. An attribute value is the entry in a specific column and row, such as "John Doe" or "35".

A tuple is basically the same thing as a row, except in an SQL DBMS, where the column values in a row are ordered. (Tuples are not ordered; instead, each attribute value is identified solely by the attribute name and never by its ordinal position within the tuple.) An attribute name might be "name" or "age".

A relation is a table structure definition (a set of column definitions) along with the data appearing in that structure. The structure definition is the heading and the data appearing in it is the body, a set of rows. A database relvar (relation variable) is commonly known as a base table. The heading of its assigned value at any time is as specified in the table declaration and its body is that most recently assigned to it by invoking some update operator (typically, INSERT, UPDATE, or DELETE). The heading and body of the table resulting from evaluation of some query are determined by the definitions of the operators used in the expression of that query. (Note that in SQL the heading is not always a set of column definitions as described above, because it is possible for a column to have no name and also for two or more columns to have the same name. Also, the body is not always a set of rows because in SQL it is possible for the same row to appear more than once in the same body.)

##### Key/constraint glossary

http://en.wikipedia.org/wiki/Relational_model#Key_constraints_and_functional_dependencies



### "Vulnerability to Anomalies"

Relations are classified based upon the types of anomalies to which they're vulnerable. A database that's in the first normal form is vulnerable to all types of anomalies, while a database that's in the domain/key normal form has no modification anomalies. Normal forms are hierarchical in nature. That is, the lowest level is the first normal form, and the database cannot meet the requirements for higher level normal forms without first having met all the requirements of the lesser normal forms



### Normalization


##### Normal Forms


###### 1st Normal Form (1NF)
http://en.wikipedia.org/wiki/First_normal_form
Each model has only atomic attributes.



###### 2NF
http://en.wikipedia.org/wiki/Second_normal_form

Specifically: a table is in 2NF if and only if it is in 1NF and no non-prime attribute is dependent on any proper subset of any candidate key of the table. A non-prime attribute of a table is an attribute that is not a part of any candidate key of the table.


###### 3NF
http://en.wikipedia.org/wiki/Third_normal_form
Key is named in a way that captures information more effectively.

...

###### 6NF
Table features no non-trivial join dependencies at all (with reference to generalized join operator)

http://en.wikipedia.org/wiki/Sixth_normal_form

See also Anchor Modeling (http://en.wikipedia.org/wiki/Anchor_Modeling)

and aspect: http://en.wikipedia.org/wiki/Aspect_(computer_programming)
