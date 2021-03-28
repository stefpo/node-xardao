/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

modCRUDAdapter = require ('./crud-adapter')
exports.DataTable = require ('./datatable').DataTable
exports.CRUDAdapter = modCRUDAdapter.CRUDAdapter

function Connection(driver) {
    let Conn 
    try {
        if (driver == 'mysql' || driver == 'mariadb') { 
            if ( Conn == undefined ) Conn = require ('./driver_mariadb').Connection
            let cn = new Conn()
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'sqlite' || driver == 'sqlite3') { 
            if ( Conn == undefined ) Conn = require ('./driver_sqlite3').Connection
            let cn = new Conn() 
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'pg' || driver == 'pgsql' || driver == 'postgres') { 
            if ( Conn == undefined ) Conn = require ('./driver_pgsql').Connection
            let cn = new Conn() 
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'ms' || driver == 'mssql') { 
          if ( Conn == undefined ) Conn = require ('./driver_mssql').Connection
          let cn = new Conn() 
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

exports.Connection = Connection


exports.express = {}
exports.express.usingDBConnection = function usingDBConnection(connSpec, page ) {

    return function(req, res, next) {
        var connInfo 
        if (typeof(connSpec) == "object") connInfo = connSpec
        else if (typeof(connSpec) == "string" ){ 
            if ( req.appconfig ) connInfo = req.appconfig[connSpec]
            else if ( req.app.settings[connSpec] ) connInfo = req.app.settings[connSpec] 
            else if ( req.app.settings.config ) connInfo = req.app.settings.config[connSpec] 
            else throw "No config found"
        }
        else throw "Invalid database specification"

        var db = Connection(connInfo.driver)
        db.debugMode = connInfo.debugMode || false
        db.openCB(connInfo.dbInfo, 
            function (err) { 
                if (err) { next(err) }
                else { 
                    res.on("finish", 
                    function() { 
                        db.close() 
                    } )  
                    req.conn=db
                    page(req, res, next)
                }
            }
        )

    }
}

exports.express.connect = async function connect(config, req, res) {
    let conn 
    try {
        conn = Connection(config.driver)
        conn.debugMode = config.debugMode || false

        await conn.open(config.dbInfo)
        
        res.on("finish", 
            function() { 
                conn.close() 
            } )        

        return conn
    } catch (e) {
        throw `Cannot open database: ${e}`
    }
}

module.exports.Connection = Connection