![image_squidhome@2x.png](http://i.imgur.com/7rMxw.png)

# Sails Waterline

Waterline is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs.  That means you write the same code to get users, whether they live in mySQL, LDAP, MongoDB, or Facebook.

At the same time, Waterline aims to learn lessons and maintain the best features from  both Rails' ActiveRecord and Grails' Hibernate ORMs.

Waterline also comes with built-in transaction support which takes advantage of any API the datstore you're using offers, but falls back to maintaining a separate atomic commit log (i.e. the same way Mongo does transactions).
