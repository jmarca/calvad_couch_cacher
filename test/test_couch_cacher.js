/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var superagent = require('superagent')

var couchCache = require('../.').couchCache

var env = process.env;
var cuser = env.COUCHDB_USER ;
var cpass = env.COUCHDB_PASS ;
var chost = env.COUCHDB_HOST || 'localhost';
var cport = env.COUCHDB_PORT || 5984;

var test_db ='test%2fcouch%2fcacher'
var couch = 'http://'+chost+':'+cport+'/'+test_db

var docs = {'docs':[{'_id':'doc1'
                    ,foo:'bar'}
                   ,{'_id':'doc2'
                    ,'baz':'bat'}
                   ]}
var created_locally=false
before(function(done){
    // create a test db, the put data into it
    superagent.put(couch)
    .type('json')
    .auth(cuser,cpass)
    .end(function(e,r){
        r.should.have.property('error',false)
        if(!e)
            created_locally=true
        // now populate that db with some docs
        superagent.post(couch+'/_bulk_docs')
        .type('json')
        .set('accept','application/json')
        .send(docs)
        .end(function(e,r){
            if(e) done(e)
            _.each(r.body
                  ,function(resp){
                       resp.should.have.property('ok')
                       resp.should.have.property('id')
                       resp.should.have.property('rev')
                   });
            return done()
        })
        return null
    })
})
after(function(done){
    if(!created_locally) return done()

    var couch = 'http://'+chost+':'+cport+'/'+test_db
    // bail in development
    //return done()
    superagent.del(couch)
    .type('json')
    .auth(cuser,cpass)
    .end(function(e,r){
        if(e) return done(e)
        return done()
    })
    return null
})

var cacher = couchCache()
describe('instantiate couchcacher',function(){
    it('should have its four methods',function(done){
        cacher.should.have.property('stash')
        cacher.should.have.property('save')
        cacher.should.have.property('get')
        cacher.should.have.property('reset')
        done()
    })
})

describe('use couchcacher',function(){
    it('should stash docs')
    it('should save docs')
    it('should get docs')
    it('should reset docs')

})
