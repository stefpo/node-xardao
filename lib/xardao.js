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
        page(req,res, AfterPage)
      }

      function AfterPage(err) {
        req.conn.close(function(cerr) {
          if (err != undefined ) next(err)    
          else if (cerr != undefined ) next(cerr)
          next()
        })
      }

      BeforePage()
    }
}