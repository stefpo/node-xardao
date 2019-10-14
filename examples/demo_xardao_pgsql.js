/********************************************************************************
 * test_dbao_sqlite3.js
 * Test and demo Sqlite3 dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/
rdao = require ('../lib/xardao.js'); 

cn = new rdao.Connection('pg');

function logError(e) {
    console.log('Error '+ e)
}

function test1(next) {

    test_openConn();

  
    function test_openConn() {
        cn.open({ host: 'localhost', user: 'apptestusr', password: 'apptestpw', database: 'apptest'}, 
            function (err) { 
                if (err) { logError(err); closeDatabase() }
                else { console.log('Database opened'); test_exec(); }
                },
        );
    }

    function test_exec() {
        let insertSql= "insert into contact (Firstname, Lastname, Birthdate, Age) values (@Firstname, @Lastname, @Birthdate, @Age) returning id"
        let script =  [];
        //cn.debugMode = false;
        script.push("start transaction");
        script.push("drop table if exists contact");
        script.push("create table contact( Id serial primary key, Firstname varchar(50), Lastname varchar(50), Birthdate timestamp, age int)");
        script.push({ sql: insertSql,
                    params: {
                        Firstname: 'James', 
                        Lastname: 'O\'Connor', 
                        Birthdate: new Date(1957,7,9), 
                        Age: 62 }
                    });
        for (let i=0; i<1000; i++) {                     
            script.push({ sql: insertSql,
                        params: {
                            Firstname: 'John'+i, 
                            Lastname: 'Doe-'+i, 
                            Birthdate: new Date(2001,5,8), 
                            Age: 18 }                    
                        });
        }
        script.push("commit");
        cn.exec(script, 
            function(err) {
                if (err) closeDatabase();
                else test_getDataTable();
            } );
    }

    function test_getDataTable() {
        //cn.timeoutMilliSeconds = 1;

        cn.getDataTable("select * from contact",
            function(err,dt) {
                if (err) closeDatabase();
                else { console.log( dt.json());  test_getScalar(); }
            } ); 
    }

    function test_getScalar() {
        cn.getScalar( { sql:"select age from contact where Firstname=@Firstname", params: { 'Firstname': 'James' } },
            function(err,v) {
                if (err) closeDatabase();
                else {console.log(v); test_getlist();} 
            } );             
    }

    function test_getlist(){
        cn.getKVList( "select Firstname, Lastname from contact" ,    
            function(err,v) {
                if (err) closeDatabase();
                else {console.log(JSON.stringify(l)); closeDatabase();}
            } );                
    }

    function closeDatabase() {
        cn.close(
            () => { console.log('Database closed'); if(next) next(); },
            () => { console.log('Error closing the database'); },
        );
    }
}

function test2() {
    console.log(cn.sqlParam(new Date(168,2,4, 7,8,9)));
    console.log(cn.sqlParam("James O'Connor"));
    console.log(cn.sqlParam(1492));
    console.log(cn.sqlParam(1.6E-19));
}

test1();
test2();

