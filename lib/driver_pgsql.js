/********************************************************************************
 * rdao_sqlite3.js
 * Sqlite3 rdao driver
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var pg = require('pg');
var data = require('./datatable.js');
var rdao = require ('./rdao_common.js');
var ESNext = require('./esnext');

isFunction = rdao.isFunction;
then = rdao.then;

class Connection {
    constructor() {
        this.debugMode = true;
        this.lastInsertId = null;
        this.lastStatementChanges = null;
        this.timeoutMilliSeconds = 10000;
        this.explicitReturnKey = true

        this.open = ESNext(this.openCB,this)
        this.getDataTable = ESNext(this.getDataTableCB,this)
        this.getList = ESNext(this.getListCB,this)
        this.getKVList = ESNext(this.getKVListCB,this)
        this.getScalar = ESNext(this.getScalarCB,this)
        this.exec = ESNext(this.execCB,this)
        this.execSingle = ESNext(this.execSingleCB,this)
        this.execMultiple = ESNext(this.execMultipleCB,this)
        this.readTableStructure =  ESNext(this.readTableStructureCB,this)
        this.close = ESNext(this.closeCB,this)
    }

    open() {}
    getDataTable() {}
    getList() {}
    getKVList() {}
    getScalar() {}
    exec() {}
    execSingle() {}
    execMultiple() {}
    readTableStructure() {}
    close() {}
    
    debug(f,s) {
       if (this.debugMode) console.error(f + ": " + s)
    }

    openCB(dbname, callback) {
        this.db =  new pg.Client(dbname);
        this.debug('open','Opening connection for PostgresQL')
        this.db.connect(callback);
    }

    batch() {
        return new rdao.Batch(this);
    }

    closeCB(callback) {
        try {
            this.debug('close','Closing connection for PostgresQL')
            this.db.end();
            then(callback);
        } catch (e) {
            then( function() { callback(e) }  );
        }        
    }

    sqlDate(d) { return rdao.sqlDate(this,d) }
    sqlParam(value) { return rdao.sqlParam(this, value) }
    mergeParams(sql, params) { return rdao.mergeParams(this, sql, params) }
    getRealSql(queryObject) { return rdao.getRealSql(this, queryObject) }

    getDataTableCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query(realSql, function(err, result)  {
            let dt = new data.DataTable;

            function finish() {
                self.debug("getDataTable",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, dt) } );            
            }

            if (err) {
                self.debug("getDataTable",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let rows=result.rows;
                if (rows.length > 0 ) {
                    let cols = Object.keys(rows[0])
                    for (let c = 0; c< cols.length; c++) dt.addColumn(cols[c])
                    let r = 0
                    setImmediate( function populateTable() {
                        if (r<rows.length) {
                            dt.addRow( dt.newRow(rows[r]));
                            r++
                            setImmediate(populateTable)
                        } else {
                            finish()
                        }
                    } )
                } else {
                    finish()
                }
            }
        });
    }

    getListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
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
        });
    }    

    readTableStructureCB(tn, callback) {
        var ts = Date.now();
        var self = this;
        let realSql = `select COLUMN_NAME from information_schema.COLUMNS where TABLE_NAME = '${tn}'`
        this.debug("readStructure",realSql);
        this.db.query(realSql, [], function(err,result)  {
            if (err) {
                self.debug("readStructure",'Error: '+err.code);
                then( function() { callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
                if (rows.length > 0 ) {
                    for (let r = 0; r<rows.length; r++ ) {
                        list.push(rows[r]['column_name']);
                    }
                }
                self.debug("readStructure",'Completed in ' + (Date.now() -ts) + ' ms');
                if (isFunction(callback)) then( function() { callback(undefined, list) } );
            }
        });
    }        

    getKVListCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getKVList",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getKVList",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
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
        });
    }       

    getScalarCB(params, callback) {
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        var self = this;
        this.debug("getDataTable",realSql);
        this.db.query(realSql, function(err,result)  {
            if (err) {
                self.debug("getScalar",'Error: '+err.code);
                then( function() {callback(err)}) ;
            } else {
                let list = [];
                let rows=result.rows;
                if (rows.length > 0 ) {
                    let k = Object.keys(rows[0]);
                    let k1 = k[0];
                    let ret = rows[0][k1];
                    if (isFunction(callback)) then( function() { callback(undefined, ret) } );
                } else {
                    if (isFunction(callback)) then( function() { callback(undefined, []) } );
                }
                self.debug("getScalar",'Completed in ' + (Date.now() -ts) + ' ms');
                
            }
        });
    
    }

    execCB(params, callback) { rdao.exec(this, params, callback) }
    execMultipleCB(queries, callback) { rdao.execMultiple(this, queries, callback) }

    execSingleCB(params, callback) {
        var self=this;
        var ts = Date.now();
        var realSql = this.getRealSql(params); 
        this.debug("execSingle",realSql);
        this.db.query(realSql, function(err, result)  {
            if (err) { 
                self.debug("execSingle",'Error: '+err);
                then( function() {callback(err)}) ;
            }
            else { 
                if (result.rows.length > 0 ) {
                    let k = Object.keys(result.rows[0]);
                    let k1 = k[0];
                    self.lastInsertId = result.rows[0][k1];
                }
                self.lastStatementChanges = result.rowCount; if (self.lastStatementChanges == null ) self.lastStatementChanges = 0;
                self.debug("execSingle",'Completed in ' + (Date.now() -ts) + ' ms LastId: ' + self.lastInsertId + ' Changes: '+self.lastStatementChanges);                
                then(callback)
            };
        });
    }
}

exports.Connection = Connection;
 