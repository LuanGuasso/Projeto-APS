const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/cadastro", async (req, res) => {
  const {
    tipo, nome, data_nascimento, contato, cpf, rg,
    cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha
  } = req.body;

  try {
    db.query("SELECT * FROM usuarios WHERE nome = ?", [nome], async (err, results) => {
      if (err) return res.status(500).json({ error: "Erro no servidor" });

      if (results.length > 0) {
        return res.status(400).json({ error: "Usuário já cadastrado!" });
      }

      const hashSenha = await bcrypt.hash(senha, 10);

      const sql = `INSERT INTO usuarios 
        (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(sql, [
        tipo, nome, data_nascimento, contato, cpf, rg, cidade,
        endereco, estado_civil, sexo, nome_pai, nome_mae, hashSenha
      ], (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: "Erro ao cadastrar usuário" });
        }
        res.json({ message: "Usuário cadastrado com sucesso!" });
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/login", (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ error: "Informe nome e senha!" });
  }

  db.query("SELECT * FROM usuarios WHERE nome = ?", [nome], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erro no servidor" });

    if (results.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado. Faça o cadastro primeiro!" });
    }

    const usuario = results[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha incorreta!" });
    }

    res.json({ message: "Login realizado com sucesso", usuario });
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

