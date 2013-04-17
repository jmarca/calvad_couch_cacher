/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var superagent = require('superagent')
var async = require('async')

var couch_cacher = require('../.').couchCache

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
var cacher = couch_cacher()
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
    it('should reset docs')

})

var ts = new Date(2008,6,25,13,0).getTime()/ 1000
var endts =  new Date(2008,6,25,15,0).getTime()/1000

describe('couchCache get',function(){
    it('can get something',function(done){
        var get = cacher.get(function(record){console.log(record)})

        async.parallel([function(cb){
                            var feature = {'properties':{'detector_id':'1013410'
                                                        ,'ts':ts
                                                        ,'endts':endts
                                                        }}

                            get(feature
                                  ,function(e,d){
                                       console.log(d)
                                       cb(e)
                                   });
                        }
                       ,function(cb){
                            var feature = {'properties':{'detector_id':'1010510'
                                                        ,'ts':ts
                                                        ,'endts':endts
                                                        }}
                            get(feature
                                  ,function(e,d){
                                       console.log(d)
                                       cb(e)
                                   })
                        }]
                      ,done)

    })
})
