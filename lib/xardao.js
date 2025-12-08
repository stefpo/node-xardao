/********************************************************************************
 * xardao.js
 * data structure for SQL database interactions
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

import * as  modCRUDAdapter from'./crud-adapter.js'
import { URL } from 'url'
import { importSync } from './import-sync.cjs'

export const CRUDAdapter = modCRUDAdapter.CRUDAdapter

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

// Cache loaded drivers
var mariadbDriver, sqliteDriver, pgDriver, mssqlDriver, sfDriver

export function Connection(url) {
    let driver
    let connInfo = parseConnUrl(url)
    if (connInfo) { 
        driver = connInfo.protocol.substring(0,connInfo.protocol.length-1) 
    }
    else driver=url
    

    try {
        if (driver == 'mysql' || driver == 'mariadb') { 
            if (mariadbDriver == undefined ) mariadbDriver = importSync('./driver_mariadb.js')
            let cn = new mariadbDriver.Connection(connInfo)
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'sqlite' || driver == 'sqlite3') { 
            if (sqliteDriver == undefined ) sqliteDriver = importSync('./driver_sqlite3.js')
            let cn = new sqliteDriver.Connection(connInfo)
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'pg' || driver == 'pgsql' || driver == 'postgres.js') { 
            if (pgDriver == undefined ) pgDriver = importSync('./driver_pgsql.js')
            let cn = new pgDriver.Connection(connInfo)            
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }
        else if (driver == 'ms' || driver == 'mssql') { 
            if (mssqlDriver == undefined ) mssqlDriver = importSync('./driver_mssql.js')
            let cn = new mssqlDriver.Connection(connInfo)      
          cn.createCRUDAdapter = function(table, pk) {
              return modCRUDAdapter.createCRUDAdapter(this, table, pk)
          }
          return cn 
        }   
        else if (driver == 'sf' || driver == 'snowflake') { 
            if (sfDriver == undefined ) sfDriver = importSync('./driver_snowflake.js')
            let cn = new sfDriver.Connection(connInfo)              
            cn.createCRUDAdapter = function(table, pk) {
                return modCRUDAdapter.createCRUDAdapter(this, table, pk)
            }
            return cn 
        }                           
        else {
            throw new Error('Invalid xardao driver name')
        }
    } catch(e) {
        console.log(e)
        throw new Error(e)
    }
}


export var express = {}
express.usingDBConnection = function usingDBConnection(connSpec, page ) {
    return function(req, res, next) {
        let connInfo
        if (typeof(connSpec) == "object") connInfo = connSpec
        else if (typeof(connSpec) == "string" ){ 
            if ( req.appconfig ) connInfo = req.appconfig[connSpec]
            else if ( req.app.settings[connSpec] ) connInfo = req.app.settings[connSpec] 
            else if ( req.app.settings.config ) connInfo = req.app.settings.config[connSpec] 
            else throw "No config found"
        }
        else throw "Invalid database specification"

        if (typeof(connInfo) == 'string') {
                let db = new Connection(connInfo)
                db.debugMode = connSpec.debugMode || false
                db.openCB(undefined, 
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
            } else if (typeof(connInfo) == "object"){
            let db = Connection(connInfo.driver)
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
                } )
            } else {
                throw "Invalid database specification"
            }
    }
}

express.connect = async function connect(config, req, res) {
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

