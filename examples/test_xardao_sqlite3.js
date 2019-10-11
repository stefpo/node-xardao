/********************************************************************************
 * test_dbao_sqlite3.js
 * Test and demo Sqlite3 dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/
rdao = require ('../lib/xardao.js'); 

cn = new rdao.Connection('sqlite');

function logError(e) {
    console.log('Error '+ e)
}

function test1(next) {

    test_openConn();
    
    function test_openConn() {
        cn.open('temp/test_database.sqlite', 
            function (err) { 
                if (err) { logError(err); }
                else { console.log('Database opened'); test_exec() }
                },
        );
    }

    function test_execX() {
        let insertSql= "insert into contact (Firstname, Lastname, Birthdate, Age) values (@Firstname, @Lastname, @Birthdate, @Age)"
        let script =  [];
        //cn.debugMode = false;
        script.push("begin transaction");
        script.push("drop table if exists contact");
        script.push("create table contact( Id integer primary key autoincrement, Firstname text, Lastname text, Birthdate datetime, age int)");
        script.push({ sql: insertSql,
                    params: {
                        Firstname: 'James', 
                        Lastname: 'O\'Connor', 
                        Birthdate: new Date(1957,7,9), 
                        Age: 62 }
                    });
        for (let i=0; i<10; i++) {                     
            script.push({ sql: insertSql,
                        params: {
                            Firstname: 'John'+i, 
                            Lastname: 'Doe-'+i, 
                            Birthdate: new Date(2001,5,8), 
                            Age: 18 }                    
                        });
        }
        script.push("commit transaction");
        cn.exec(script, 
            function(err) {
                if (err) closeDatabase();
                else test_getDataTable();
            } );
    }

    function test_exec() {
        let insertSql= "insert into contact (Firstname, Lastname, Birthdate, Age) values (@Firstname, @Lastname, @Birthdate, @Age)"
        cn.batch()
            .add("begin transaction")
            .add("drop table if exists contact")
            .add("create table contact( Id integer primary key autoincrement, Firstname text, Lastname text, Birthdate datetime, age int)")
            .add({ sql: insertSql,
                    params: {
                        Firstname: 'James', 
                        Lastname: 'O\'Connor', 
                        Birthdate: new Date(1957,7,9), 
                        Age: 62 }
                    })
                    /*
        for (let i=0; i<10; i++) {                     
            script.push({ sql: insertSql,
                        params: {
                            Firstname: 'John'+i, 
                            Lastname: 'Doe-'+i, 
                            Birthdate: new Date(2001,5,8), 
                            Age: 18 }                    
                        })
        }*/
            .add("commit transaction")
            .exec (  function(err) {
                if (err) closeDatabase();
                else test_getDataTable();
            } );  

    }    

    function test_getDataTable() {
        cn.getDataTable("select * from contact",
            function(err, dt) {
                if (err) closeDatabase();
                else { console.log( dt.json());  test_getScalar(); }
            } ); 
    }

    function test_getScalar() {
        cn.getScalar( { sql:"select age from contact where Firstname=@Firstname", params: { 'Firstname': 'James' } },
            function(err, v) {
                if (err) closeDatabase();
                else {console.log(v); test_getlist();} 
            } );             
    }

    function test_getlist(){
        cn.getKVList( "select Firstname, Lastname from contact" ,    
            function(err, l) {
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

