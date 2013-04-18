/* global JSON console require process */
var superagent = require('superagent')
var _ = require('lodash')
var globals=require('./globals.js')
var geom_utils = require('geom_utils')
var toQuery = require('couchdb_toQuery')

var env = process.env
var _cuser = env.COUCHDB_USER
var _cpass = env.COUCHDB_PASS
var _chost = env.COUCHDB_HOST
var _cport = env.COUCHDB_PORT || 5984

var make_bulkdoc_saver = require('couchdb_bulkdoc_saver')

var couchCache = function(opts){
    if(opts===undefined) opts = {};
    var years = opts.years || [2007,2008,2009,2010,2011,2012,2013];
    var districts = ['d01','d02','d03','d04','d05','d06'
                    ,'d07','d08','d09','d10','d11','d12'
                    ,'wim','hpms'];
    var cuser = opts.user || _cuser
    var cpass = opts.pass || _cpass
    var chost = opts.host || _chost
    var cport = opts.port || _cport
    var couch = 'http://'+chost+':'+cport;

    // create a per instance caching thing that is local to the local job
    var bins={};
    function reset(){
        _.forEach(districts
                 ,function(d){
                      if(bins[d] !== undefined){
                          delete bins[d]
                      }
                      bins[d] = {}
                      _.forEach(years
                               ,function(y){
                                    bins[d][y]=[]
                                })
                  });

    };

    function stash(records,tk){
        // put the records into the correct bin for storage
        var year = tk.substr(0,4)+''
        var dist = globals.district_from_detector(records[0].detector_id)
        _.each(records,function(record){
            record._id=[record.detector_id,tk].join('-')
            bins[dist][year].push(record)
        });
    }

    function get(reducer){
        if(reducer === undefined){reducer = function(){}}
        return function(feature,next){
            // if no next, make a placeholder
            if(next === undefined){
                next = function(){return null;}
            }
            var did = feature.properties.detector_id
            var numericpart = did.match(/\d+/);

            // as above, assume vds, then test for wim
            var detector_id = numericpart[0];

            // special handling for WIM
            if(/wim/.exec(did)){
                // WIM data has a direction
                var dir = feature.properties.direction
                if(dir !== undefined){
                    // mash it up
                    detector_id = ['wim',numericpart[0],dir.charAt(0).toUpperCase()].join('.');
                }else{
                    detector_id=feature.properties.detector_id
                }
            }

            var start = new Date(1000 * feature.properties.ts);
            var end   = new Date(1000 * feature.properties.endts);

            // document id pattern is 715898-2009-01-01 04:00, so make from and to accordingly

            var query = {'reduce':false
                        ,'inclusive_end':true
                        ,'include_docs':true
                        }
            var d = start;

            // define the doc key
            query.startkey = [[detector_id
                              ,d.getFullYear()+''
                              ,geom_utils.pad(d.getMonth()+1)+''
                              ,geom_utils.pad(d.getDate())+''].join('-')
                             ,[geom_utils.pad(d.getHours())+'','00'].join(':')
                             ].join(' ');
            d = end;
            query.endkey = [[detector_id
                            ,d.getFullYear()+''
                            ,geom_utils.pad(d.getMonth()+1)+''
                            ,geom_utils.pad(d.getDate())+''].join('-')
                           ,[geom_utils.pad(d.getHours())+'','00'].join(':')
                           ].join(' ');
            // convert to a real query string
            query = toQuery(query)

            var year = start.getFullYear()
            var district = globals.district_from_detector(detector_id)
            var couch_database = ['imputed','collated',district,year].join('%2f')
            var source = [couch,couch_database].join('/')
            var from = source + '/_all_docs' + '?' + query
            superagent.get(from)
            .set('Content-Type', 'application/json')
            .set('Accept','application/json')
            .set('followRedirect',true)
            .end(function(e,r){
                if(e) return next(e);
                var doc = r.body
                if(doc.rows === undefined || doc.rows.length==0 ){
                    // do nothing
                    return next()
                }else{
                    // get the values for each row and return
                    var rows = doc.rows;
                    // recall how couchdb works:
                    //                   {"total_rows":3,"offset":0,"rows":[
                    // {"id":"bar","key":"bar","value":{"rev":"1-4057566831"},"doc":{"_id":"bar","_rev":"1-4057566831","name":"jim"}},
                    // {"id":"baz","key":"baz","value":{"rev":"1-2842770487"},"doc":{"_id":"baz","_rev":"1-2842770487","name":"trunky"}}
                    // ]}
                    _.forEach(rows
                             ,function(row){
                                  // pass doc to reducer
                                  reducer(row.doc)
                              });
                    return next(null,rows);
                }
                return null;
            });

            return null;
        }
    }

    function save(next){
        if(next===undefined){next = function(){};}
        var districts = _.keys(bins)
        async.eachLimit(districts,2,function(dist,dist_cb){
            var years = _.keys(bins[dist])
            async.eachLimit(years,1,function(year,yr_cb){
                var couch_db = ['imputed','collated',dist,year].join('%2f')
                var saver = make_bulkdoc_saver(couch_db)
                async.whilst(function(){
                    return bins[dist][year] !== undefined && bins[dist][year].length > 0;
                },function(callback){
                      var chunk = bins[dist][year].splice(0,1000);
                      console.log(['next',chunk.length,'records,',bins[dist][year].length,'remaining'].join(' '))
                      saver(chunk,callback);
                  },function(error){
                        return yr_cb(error)
                    });
            },function(error){
                  return dist_cb(error);
              });
        },function(e){
              reset();
              if(e){
                  console.log('problem with saving docs '+e)
                  next(e)
              }
              console.log('done with saving all docs');
              next()
          });
        return null;
    }

    return {'reset':reset
           ,'save':save
           ,'get':get
           ,'stash':stash};

};

exports.couchCache=couchCache;
