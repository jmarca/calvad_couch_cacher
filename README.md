# CalVAD Couch Cacher

If you are using this and it is unrelated to CalVAD, you might be
insane.

The idea is to handle map reduce, chained.

So run a reduce job on lots of dbs, then save the output to another
CouchDB.

This file provides a function called couchCacher, that give access to
stash, save, get, and reset.  Stash will temporarily collect documents
for reducing.  Save will save those documents to a single couchdb.
Get will get docs from CouchDB.  Reset will reset the stash.

More documentation later as I work out the tests, but really this is
all pulled out of geo_bbox and has been in use for a while.
