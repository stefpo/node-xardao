/********************************************************************************
 * test_datatable.js
 * test and demo the datatable object.
 * 
 * Author : Stephane Potelle 
 * Email  : stephane.potelle@gmail.com
********************************************************************************/


data = require ('./datatable.js');

console.logt = function(s) {
    var d = new Date (Date.now());
    console.log(JSON.stringify(d) + ' ' + s)
}

const tableSize = 100000;

dt = new  data.DataTable('MyTable');
dt.addColumn('Firstname');
dt.addColumn('Lastname');
dt.addColumn( 'Email');
dt.addColumn( 'Birthdate');


r = dt.newRow();
r.set('Firstname', 'Stéphane');
r.set('Lastname', 'Potelle');
r.set(2, 'stephane.potelle@gmail.com');
dt.addRow(r);

dt.addRow(dt.newRow());

dt.addRow (dt.newRow( {
    'Firstname': 'Delphine',
    'Lastname': 'Potelle',
    'Email': 'delphine.potelle@gmail.com',
    'Invalid field': 'Dummy value'}));

dt.addRow (dt.newRow( {
    'Firstname': 'Alexis',
    'Lastname': 'Potelle',
    'Email': 'alexis.potelle@gmail.com',
    'Invalid field': 'Dummy value'}));

console.logt('Adding ' + tableSize + ' rows')

for (let i = 0 ; i< tableSize; i++ ) {
    dt.addRow (dt.newRow( {
        'Firstname': 'fisrt'+i,
        'Lastname': 'last'+i,
        'Email': 'email'+i}));
}    

console.logt('Adding 2 columns');
dt.addColumn("AddedColumn");
dt.addColumn("AddedColum2", "Default value");

console.logt('Deleting 1 row');
dt.delRow(2);

console.logt('Deleting 1 column');
dt.delColumn('Birthdate');

console.logt('Starting sync loop');
for (let i = 0 ; i< dt.rows.count; i++) {
    r = dt.rows[i];
    s = JSON.stringify(r.toObject());
}
console.logt ('Loop complete') ;

console.logt('Starting async loop');
dt.forEachRow(
    //(r) => { console.logt (JSON.stringify(r.toObject())); },
    (r) => { s = JSON.stringify(r.toObject()); },
    () => { console.logt ('Loop complete') }
);


