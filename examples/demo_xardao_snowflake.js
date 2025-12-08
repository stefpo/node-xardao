/********************************************************************************
 * test_dbao_snowflake.js
 * Test and demo Snowflake dao library
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/

import * as  xardao from '../lib/xardao.js' 

function logError(e) {
    console.log('Error '+ e)
}

process.on('unhandledRejection', function(err) {
    logError('unhandledRejection:' + err.stack);
});

async function test1(next) {
    let retErr 

    /* Connection string example
    snowflake: 'sf://keysight.snowflakecomputing.com?account=yourCompany&user=YourUserName&password=YourPassword&db=INTEGRATION&warehouse=BI_WH&schema=SALESFORCE_KT_PROD'

    please check https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-install for detailed parameter reference

    */
    let cn = new xardao.Connection(require('./conninfo').snowflake)
    try {
        await cn.open()
        console.log("Connection open")

        let o = await cn.getObjects({ sql: `
            SELECT top 100 M.NAME MANUFACTURER, P.MANUFACTURERMODELNUMBER__C, A.SERIALNUMBER  
            FROM asset A
            INNER JOIN Product2 P ON P.ID = A.PRODUCT2ID
            INNER JOIN MANUFACTURER__C M ON M.Id = P.MANUFACTURER__C 
            WHERE M.NAME LIKE 'Wiha%'
        `})

        console.log(JSON.stringify(o, undefined, 4))

        o = await cn.getSingleObject({ sql: `
            SELECT top 1 ID, FIRSTNAME, LASTNAME, EMAIL 
            FROM CONTACT
            ORDER BY CREATEDDATE 
        `})        
        console.log(JSON.stringify(o, undefined, 4))

        o = await cn.getList({ sql: `
            SELECT DISTINCT top 100  STATUS FROM ASSET
        `})        
        console.log(JSON.stringify(o, undefined, 4))    
        
        o = await cn.getKVList({ sql: `
            SELECT DISTINCT top 100  STATUS, MAX(ASSETTYPE__C)  FROM ASSET  WHERE STATUS<>''   GROUP BY STATUS
        `})        
        console.log(JSON.stringify(o, undefined, 4))            

        console.log(await cn.getScalar('SELECT COUNT(*) FROM ASSET'))

        console.log('Downloading large data set')
        let ts = Date.now();
        o = await cn.getObjects({ sql: `
            SELECT M.NAME MANUFACTURER, P.MANUFACTURERMODELNUMBER__C, A.SERIALNUMBER  
            FROM asset A
            INNER JOIN Product2 P ON P.ID = A.PRODUCT2ID
            INNER JOIN MANUFACTURER__C M ON M.Id = P.MANUFACTURER__C 
        `})        

        console.log(`Completed in ${ (Date.now() -ts) / 1000 } s ${o.length} records`)

    } catch(err) {
        console.log(err.stack)
        retErr = err
    } finally {
        await cn.close()
    }
    if(next) next(retErr)
}

test1() 
