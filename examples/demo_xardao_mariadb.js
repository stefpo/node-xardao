/********************************************************************************
 * test_dbao_sqlite3.js
 * Test and demo Sqlite3 dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

var rdao = require ('../lib/xardao.js'); 
var promisify = require('util').promisify;

cn = new rdao.Connection('mariadb');

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
        await cn.open({ host: 'localhost', user: 'root', password: 'xenon21', database: 'apptest'})
        await cn.exec('start transaction')
        await cn.exec('drop table if exists contact')
        await cn.exec('create table contact( Id integer primary key auto_increment, Firstname varchar(50), Lastname varchar(50), Birthdate timestamp, Age int)')
        let tli = await contactBO.create({
                Firstname: 'James', 
                Lastname: 'O\'Connor', 
                Birthdate: new Date(1957,7,9), 
                Age: 62 } )
        console.log(`Inserted ID #${tli}`)
        console.log( JSON.stringify(contactBO.content))                
        for (let i=0; i<10; i++) {                     
            await contactBO.create({
                    Firstname: 'John'+i, 
                    Lastname: 'Doe-'+i, 
                    Birthdate: new Date(2001,5,8), 
                    Age: 18                   
                })
        }

        await contactBO.update({Id:2, Age: 57})
        await cn.exec('commit')

        let o = await contactBO.read(2)
        console.log( JSON.stringify(o))
        console.log( JSON.stringify(contactBO.content))

        contactBO.content.Age=23
        await contactBO.update(undefined)
        o = await contactBO.read(2)
        console.log( JSON.stringify(o))

        await contactBO.delete(2)

        console.log(`Last insert Id: ${cn.lastInsertId}`)
        
        let dt = await cn.getDataTable("select * from contact")
        console.log( dt.JSON())

        let age = await cn.getScalar( { sql:"select age from contact where Firstname=@Firstname", params: { 'Firstname': 'James' } } )
        console.log( age )
        let kv = await cn.getKVList( "select Firstname, Lastname from contact" )   
        console.log( JSON.stringify(kv))

    } catch(err) {
        console.log(err)
        retErr = err
    } finally {
        await cn.close()
    }
    if(next) next(retErr)
}

test1Async = promisify (test1)



test1();


