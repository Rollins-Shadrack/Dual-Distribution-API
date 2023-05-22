const mysql = require('mysql2');

let connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'rollins/2023',
    database:'vybra'
})
connection.connect((err)=>{
    if(err) throw err
    console.log("Database Connected succesfully")
})
module.exports = connection;