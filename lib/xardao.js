/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

crypto = require("crypto")
modCRUDAdapter = require ('./crud-adapter')
exports.DataTable = require ('./datatable').DataTable
exports.CRUDAdapter = modCRUDAdapter.CRUDAdapter

let connPool = []

function Connection(connSpec) {
    let sig = getSHA256(connSpec)
    if ( connSpec.options && connSpec.options.pooled ) {
        for (let c in connPool ) {
            if ( connPool[c].signature == sig && ! connPool[c].isInUse ) return connPool[c]
        }
        let newConn = createConnection(connSpec)
        newConn.isInUse = true // Make sure no other process steals it
        newConn.lastUse = new Date(Date.now())
        newConn.pooled = true
        connPool.push(newConn)
        return newConn
    } else {
        return createConnection(connSpec)
    }
}

function createConnection(connSpec) {
    let Conn 
    let driver = "Undefined driver"
    let database = undefined
    let options = {}
    if (typeof(connSpec)=="string" ) {
        driver = connSpec
    } else {
        driver = connSpec.driver || "Undefined driver"
        database = connSpec.database || "Undefined database"
        options = connSpec.options || {}
    }
    try {
        if (driver == 'mysql' || driver == 'mariadb') { 
            if ( Conn == undefined ) Conn = require ('./driver_mariadb').Connection
            let cn = new Conn()
            cn.database = database
            cn.signature = getSHA256(connSpec)
            cn.debugMode = connSpec.options.debugMode
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'sqlite' || driver == 'sqlite3') { 
            if ( Conn == undefined ) Conn = require ('./driver_sqlite3').Connection
            let cn = new Conn() 
            cn.database = database
            cn.signature = getSHA256(connSpec)
            cn.debugMode = connSpec.options.debugMode
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'pg' || driver == 'pgsql' || driver == 'postgres') { 
            if ( Conn == undefined ) Conn = require ('./driver_pgsql').Connection
            let cn = new Conn() 
            cn.database = database
            cn.signature = getSHA256(connSpec)
            cn.debugMode = connSpec.options.debugMode
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'ms' || driver == 'mssql') { 
          if ( Conn == undefined ) Conn = require ('./driver_mssql').Connection
          let cn = new Conn() 
          cn.database = database
          cn.signature = getSHA256(connSpec)
          cn.debugMode = connSpec.options.debugMode
          cn.createCRUDAdapter = function(table, pk) {
              return modCRUDAdapter.createCRUDAdapter(this, table, pk)
          }
          return cn 
      }                
        else {
            throw new Error('Invalid RDAO driver name')
        }
    } catch(e) {
        console.log(e)
        throw new Error(e)
    }
}

function getSHA256 (obj) {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest().toString('hex');
}

exports.Connection = Connection


exports.express = {}
exports.express.usingDBConnection = function usingDBConnection(configId, page ) {

    return function(req, res, next) {
      var connInfo = req.appconfig[configId]

      function BeforePage(){
        var db = Connection(connInfo.driver)
        db.debugMode = connInfo.debugMode || false
        db.openCB(connInfo.dbInfo, 
          function (err) { 
              if (err) { AfterPage(err) }
              else { 
                  req.conn=db
                  callPage() 
              }
          }
        )
      }

      function callPage() {
        page(req, res, AfterPage)
      }

      function AfterPage(err) {
        if ( req.conn && req.conn.close ) 
            req.conn.close(function(cerr) {
            if (err != undefined ) next(err)    
            else if (cerr != undefined ) next(cerr)
            else next()
            })
        else    
            if (err != undefined ) next(err) 
            else next()
      }


      BeforePage()
    }
}