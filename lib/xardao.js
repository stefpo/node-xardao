/********************************************************************************
 * datatable.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

const modCRUDAdapter = require ('./crud-adapter')
const URL=require('url').URL

exports.DataTable = require ('./datatable').DataTable
exports.CRUDAdapter = modCRUDAdapter.CRUDAdapter

function parseConnUrl(url) {
    try {
      let tUrl=new URL(url)
      tUrl.options={}
      for (const [name, value] of tUrl.searchParams) {
        tUrl.options[name]=value
      }
      let pp=tUrl.pathname.substring(1).split("/")
      
      return {
        url:        url,
        protocol:   tUrl.protocol,
        hostname:   tUrl.hostname,
        port:       tUrl.port,
        username:   decodeURIComponent(tUrl.username),
        password:   decodeURIComponent(tUrl.password),
        pathname:   tUrl.pathname,
        database:   pp[0],
        schema:     pp.length >1  ? pp[1] : undefined,
        options:    tUrl.options
      }
    } 
    catch(e){ return undefined }
  }

function Connection(url) {
    let Conn 
    let driver
    let connInfo = parseConnUrl(url)
    if (connInfo) { 
        driver = connInfo.protocol.substring(0,connInfo.protocol.length-1) 
    }
    else driver=url
    

    try {
        if (driver == 'mysql' || driver == 'mariadb') { 
            if ( Conn == undefined ) Conn = require ('./driver_mariadb').Connection
            let cn = new Conn(connInfo)
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'sqlite' || driver == 'sqlite3') { 
            if ( Conn == undefined ) Conn = require ('./driver_sqlite3').Connection
            let cn = new Conn(connInfo) 
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'pg' || driver == 'pgsql' || driver == 'postgres') { 
            if ( Conn == undefined ) Conn = require ('./driver_pgsql').Connection
            let cn = new Conn(connInfo) 
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'ms' || driver == 'mssql') { 
          if ( Conn == undefined ) Conn = require ('./driver_mssql').Connection
          let cn = new Conn(connInfo) 
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
    let connUrlInfo = parseConnUrl(config)
    try {
        if (connUrlInfo==undefined) {
            conn = Connection(config.driver)
            conn.debugMode = config.debugMode || false
            await conn.open(config.dbInfo)
        } else  {
            conn = Connection(config)
            conn.debugMode = config.debugMode || false
            await conn.open()            
        }
        
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