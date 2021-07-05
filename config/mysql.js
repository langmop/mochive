var mysql = require("mysql2");
var con = mysql.createConnection({
  multipleStatements: true,
  host: "localhost",
  user: "root",
  password: "Gaurav@656",
  database: "imdb",
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected to database");
});

module.exports = con;
