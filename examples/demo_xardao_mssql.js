/********************************************************************************
 * test_dbao_mssql.js
 * Test and demo MSSQL dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var rdao = require ('../lib/xardao.js'); 
var promisify = require('util').promisify;

cn = new rdao.Connection('mssql');

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
    try {
        let contactBO=createContactBO(cn) 
        await cn.openAsync({ server: 'localhost', 
                            authentication: { type: 'default',
                                options: { userName: 'sa', password: 'Xenon21$'} },
                            options: { encrypt:true, database: 'apptest'}}
                            )
        await cn.execAsync('if exists ( select * from sys.tables where name=\'contact\') drop table contact')
        await cn.execAsync('create table contact( Id integer primary key identity, Firstname varchar(50), Lastname varchar(50), Birthdate datetime, Age int)')
        //await cn.execAsync('begin transaction')
        let tli = await contactBO.createAsync({
                Firstname: 'James', 
                Lastname: 'O\'Connor', 
                Birthdate: new Date(1957,7,9), 
                Age: 62 } )
        console.log(`Inserted ID #${tli}`)
        console.log( JSON.stringify(contactBO.content))                
        for (let i=0; i<10; i++) {                     
            await contactBO.createAsync({
                    Firstname: 'John'+i, 
                    Lastname: 'Doe-'+i, 
                    Birthdate: new Date(2001,5,8), 
                    Age: 18                   
                })
        }

        await contactBO.updateAsync({Id:2, Age: 57})
        //await cn.execAsync('commit')

        let o = await contactBO.readAsync(2)
        console.log( JSON.stringify(o))
        console.log( JSON.stringify(contactBO.content))

        contactBO.content.Age=23
        await contactBO.updateAsync(undefined)
        o = await contactBO.readAsync(2)
        console.log( JSON.stringify(o))

        await contactBO.deleteAsync(2)

        console.log(`Last insert Id: ${cn.lastInsertId}`)
        
        let dt = await cn.getDataTableAsync("select * from contact")
        console.log( dt.json())

        let age = await cn.getScalarAsync( { sql:"select age from contact where Firstname=@Firstname", params: { 'Firstname': 'James' } } )
        console.log( age )
        let kv = await cn.getKVListAsync( "select Firstname, Lastname from contact" )   
        console.log( JSON.stringify(kv))

    } catch(err) {
        console.log(err)
        retErr = err
    } finally {
        await cn.closeAsync()
    }
    if(next) next(retErr)
}

test1Async = promisify (test1)



test1Async();


