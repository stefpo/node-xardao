/********************************************************************************
 * snowflake.js
 * Snowflake xardao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var sf 
try {
    sf = require('snowflake-sdk');
} catch (e) {
    console.error("Please add module \"snowflake-sdk\" to your package.json dependencies")
    process.exit(1)
}

var common = require ('./common.js');
var ESNext = require('./esnext');

isFunction = common.isFunction;
then = common.then;

class Connection {
    constructor(connUrlInfo) {
        this.debugMode = false;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
        this.saveDatesAsUTC = true
        this.transactionLevel = 0
        this.connUrlInfo=connUrlInfo

        this.open = ESNext(this.openCB,this)
        this.getObjects = ESNext(this.getObjectsCB,this)
        this.getSingleObject  = ESNext(this.getSingleObjectCB ,this)
        this.getList = ESNext(this.getListCB,this)
        this.getKVList = ESNext(this.getKVListCB,this)
        this.getScalar = ESNext(this.getScalarCB,this)
        this.exec = ESNext(this.execCB,this)
        this.execSingle = ESNext(this.execSingleCB,this)
        this.execMultiple = ESNext(this.execMultipleCB,this)
        //this.readTableStructure =  ESNext(this.readTableStructureCB,this)
        this.beginTrans = ESNext(this.beginTransCB, this)
        this.commitTrans = ESNext(this.commitTransCB, this)
        this.rollbackTrans = ESNext(this.rollbackTransCB, this)     
        this.close = ESNext(this.closeCB,this)
    }

    open() {}
    getObjects() {}
    getSingleObject () {}    
    getList() {}
    getKVList() {}
    getScalar() {}
    exec() {}
    execSingle() {}
    execMultiple() {}
    readTableStructure() {}
    close() {}
    setNoCount() {}
    
    debug(f,s) {
       if (this.debugMode) console.error(f + ": " + s)
    }

    openCB(dbInfo, callback) {
        if ( typeof(this.connUrlInfo) == 'object' ) {
            let conninfo = { 
                account: this.connUrlInfo.options.account,
                username: this.connUrlInfo.options.user,
                password: this.connUrlInfo.options.password,
                //application: application
                database: this.connUrlInfo.options.db,
                schema: this.connUrlInfo.options.schema,
                warehouse: this.connUrlInfo.options.warehouse,
                authenticator: "SNOWFLAKE"
            }
            this.db = new sf.createConnection( conninfo )
        }
        else { 
            throw "Only URI-based connection is allowed"
        }
        this.debug('open','Opening connection for MariaDB')
        this.db.connect( callback )
    }

    batch() {
        return new common.Batch(this);
    }


    beginTransCB(callback) { 
        callback()
    } 

    commitTransCB(callback) { 
        callback()
    } 

    rollbackTransCB(callback) { 
        callback()
    } 

    closeCB(callback) {
        try {
            this.debug('close','Closing connection for MariaDB')
            this.db.destroy();
            then(callback);
        } catch (e) {
            then( function() { callback(e) }  );
        }        
    }

    sqlDate(d) { return common.sqlDate(this,d) }
    sqlParam(value) { return common.sqlParam(this, value) }
    mergeParams(sql, params) { return common.mergeParams(this, sql, params) }
    getRealSql(queryObject) { return common.getRealSql(this, queryObject) }

   
    getObjectsCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("getObjects",realSql);

        function finish() {
            self.debug("getObjects",'Completed in ' + (Date.now() -ts) + ' ms');
            if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
        }        

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                function finish() {
                    self.debug("getObjects",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
                }

                if (err) {
                    self.debug("getObjects",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                  if (rows.length > 0 ) {
                    ret=rows           
                    if (useSnakeCase) { for ( let i =0 ; i< ret.length; i++ ) { ret[i] = common.toSnakeCase(ret[i])} }
                    if (useCamelCase) { for ( let i =0 ; i< ret.length; i++ ) { ret[i] = common.toCamelCase(ret[i])} }        
                  } 
                  finish()                  
                }
              }
        })
    }    

    getSingleObjectCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("getObjects",realSql);

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                function finish() {
                    self.debug("getSingleObject",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
                }

                if (err) {
                    self.debug("getSingleObject",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                    if (rows.length > 0 ) {
                        let ret = rows[0];
                        if (useSnakeCase) ret = common.toSnakeCase(ret) 
                        if (useCamelCase) ret = common.toCamelCase(ret)                    
                        if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                    } else {
                        if (isFunction(callback)) then( function() { callback(undefined, undefined) } );
                    }                
                }
              }
        })
    }        

    getListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("getList",realSql);

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                function finish() {
                    self.debug("getList",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
                }

                if (err) {
                    self.debug("getList",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                    let list = [];
                    if (rows.length > 0 ) {
                        let k = Object.keys(rows[0]);
                        let k1 = k[0];
                        for (let r = 0; r<rows.length; r++ ) {
                            list.push(rows[r][k1]);
                        }
                    }
                    self.debug("getList",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { undefined, callback(undefined,list) } );             
                }
              }
        })
    }        

    getKVListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("getKVList",realSql);

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                function finish() {
                    self.debug("getKVList",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
                }

                if (err) {
                    self.debug("getKVList",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                    let list = [];
                    if (rows.length > 0 ) {
                        let k = Object.keys(rows[0]);
                        let k1 = k[0];
                        let k2 
                        if (k.length>=2) k2 = k[1]; else k2=k[0];
                        for (let r = 0; r<rows.length; r++ ) {
                            list.push( [ rows[r][k1], rows[r][k2]]);
                        }
                    }
                    self.debug("getKVList",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { undefined, callback(undefined,list) } );      
                }
              }
        })
    }            

    getScalarCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("getScalar",realSql);

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                function finish() {
                    self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );            
                }

                if (err) {
                    self.debug("getScalar",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                    if (rows.length > 0 ) {
                        let k = Object.keys(rows[0]);
                        let k1 = k[0];
                        let ret = rows[0][k1];
                        if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                    } else {
                        if (isFunction(callback)) then( function() { callback(undefined, null) } );
                    }
                    self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');            
                }
              }
        })
    }      


    execCB(params, callback) { common.exec(this, params, callback) }
    execMultipleCB(queries, callback) { common.execMultiple(this, queries, callback) }

    execSingleCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        var useSnakeCase = false
        var useCamelCase = false        
        if ( params.options ) {
            useSnakeCase = params.options.useSnakeCase || false
            useCamelCase = params.options.useCamelCase || false
        }
        this.debug("execSingle",realSql);

        this.db.execute( {
            sqlText: realSql,
            complete: function(err, stmt, rows) {
                let ret =[]

                if (err) {
                    self.debug("execSingle",'Error: '+err.code)
                    then( function() {callback(err)}) 
                } else {
                    self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms');            
                    then( function() {callback()}) 
                }
              }
        })
    }      

}

exports.Connection = Connection;
 