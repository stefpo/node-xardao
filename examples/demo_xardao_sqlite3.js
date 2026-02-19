/********************************************************************************
 * test_dbao_sqlite3.js
 * Test and demo Sqlite3 dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

import * as xardao from '../lib/xardao.js'
import * as url from 'url'
import * as path from 'path'

function logError(e) {
    console.log('Error '+ e)
}

process.on('unhandledRejection', function(err) {
    logError('unhandledRejection:' + err.stack);
});

/* Example of creating a business object 
   as a part of the model */

function createContactBO(conn) {
    let bo = conn.createCRUDAdapter('contact','Id')
    
    bo.updateValidate = function (p, callback ){
        console.log("updateValidate: "+JSON.stringify(this.content))
        if ( p.Age  >= 63 ) callback(new Error("Age must be lower than 63"))
        else callback()
    }

    bo.createValidate = bo.updateValidate 

    return bo
}

/* Example of using a combination of database commands 
   and CRUD operations to perform database operations */
async function test1(next) {
    let retErr 
    let cn = xardao.Connection('sqlite:///data/test_database.sqlite')
    try {
        let contactBO=createContactBO(cn) 
        await cn.open()

        await cn.exec([   "PRAGMA foreign_keys = '1';",
                    "PRAGMA autovacuum = '1';"])

        await cn.beginTrans()
        await cn.exec('drop table if exists contact')
        await cn.exec('create table contact( Id integer primary key autoincrement, Firstname varchar(50), Lastname varchar(50), Birthdate timestamp, Age int)')
        let tli = await contactBO.create({
                Firstname: 'James', 
                Lastname: 'O\'Connor', 
                Birthdate: new Date(1957,7,9, 12,0,0), 
                Age: 62 } )
        console.log(`Inserted ID #${tli}`)
        console.log( JSON.stringify(contactBO.content))   
        await contactBO.read(undefined)
        console.log( JSON.stringify(contactBO.content))           
        for (let i=0; i<10; i++) {                     
            await contactBO.create({
                    Firstname: 'John'+i, 
                    Lastname: 'Doe-'+i, 
                    Birthdate: new Date(2001,5,8, 18,0,0), 
                    Age: 18                   
                })
        }

        await contactBO.update({Id:2, Age: 57})
        await cn.commitTrans()

        let o = await contactBO.read(2)
        console.log( JSON.stringify(o))
        console.log( JSON.stringify(contactBO.content))

        contactBO.content.Age=23
        await contactBO.update(undefined)
        o = await contactBO.read(2)
        console.log( JSON.stringify(o))

        await contactBO.delete(2)

        console.log(`Last insert Id: ${cn.lastInsertId}`)
        
        console.log("OBJECTS")
        let oc = await cn.getObjects( { sql: "select * from contact", options: { useSnakeCase: true }  })
        console.log( JSON.stringify(oc,undefined,4))        

        let age = await cn.getScalar( { sql:"select age from contact where Firstname=@Firstname", params: { 'Firstname': 'James' } } )
        console.log( age )
        let kv = await cn.getKVList( "select Firstname, Lastname from contact" )   
        console.log( JSON.stringify(kv))

        console.log("Single object")
        let so = await cn.getSingleObject ( { sql: "select * from contact", options: { useSnakeCase: true }  })
        console.log( JSON.stringify(so))

        console.log("Adding 5000 rows")
        await cn.beginTrans()
        contactBO.createValidate = contactBO.defaultCreateValidate
        for ( let i = 0; i < 5000; i++  ) {
            await contactBO.create({
                FIRSTNAME: 'John'+i, 
                Lastname: 'Doe-'+i, 
                Birthdate: new Date(2001,5,8, 18,0,0), 
                Age: 18                   
            })            
        }
        await cn.commitTrans()
        console.log("Done")

    } catch(err) {
        console.log(err.stack)
        retErr = err
    } finally {
        await cn.close()
    }
    if(next) next(retErr)
}

process.chdir(path.dirname(url.fileURLToPath(import.meta.url)))

console.log( `Working directory is ${process.cwd()}`)

test1();


