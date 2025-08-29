const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",     
  password: "",     
  database: "sistema_cadastro"
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
    return;
  }
  console.log("Conectado ao MySQL!");
});

module.exports = db;
