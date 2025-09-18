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
    tipo,
    nome,
    data_nascimento,
    contato,
    cpf,
    rg,
    cidade,
    endereco,
    estado_civil,
    sexo,
    nome_pai,
    nome_mae,
    senha,
  } = req.body;

  try {
    db.query(
      "SELECT * FROM usuarios WHERE nome = ?",
      [nome],
      async (err, results) => {
        if (err) return res.status(500).json({ error: "Erro no servidor" });

        if (results.length > 0) {
          return res.status(400).json({ error: "Usuário já cadastrado!" });
        }

        const hashSenha = await bcrypt.hash(senha, 10);

        const sql = `INSERT INTO usuarios 
        (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(
          sql,
          [
            tipo,
            nome,
            data_nascimento,
            contato,
            cpf,
            rg,
            cidade,
            endereco,
            estado_civil,
            sexo,
            nome_pai,
            nome_mae,
            hashSenha,
          ],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res
                .status(500)
                .json({ error: "Erro ao cadastrar usuário" });
            }
            res.json({ message: "Usuário cadastrado com sucesso!" });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/login", (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ error: "Informe nome e senha!" });
  }

  db.query(
    "SELECT * FROM usuarios WHERE nome = ?",
    [nome],
    async (err, results) => {
      if (err) return res.status(500).json({ error: "Erro no servidor" });

      if (results.length === 0) {
        return res
          .status(401)
          .json({ error: "Usuário não encontrado. Faça o cadastro primeiro!" });
      }

      const usuario = results[0];
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ error: "Senha incorreta!" });
      }

      res.json({ message: "Login realizado com sucesso", usuario });
    }
  );
});


// Rota para listar todos os alunos
app.get("/api/alunos", (req, res) => {
  db.query(
    "SELECT id, nome, contato, cpf, cidade FROM usuarios WHERE tipo = 'aluno'",
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao buscar alunos" });
      }
      res.json(results);
    }
  );
});

// Rota para listar todos os professores
app.get("/api/professores", (req, res) => {
  db.query(
    "SELECT id, nome, contato FROM usuarios WHERE tipo IN ('professor', 'coordenador')",
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao buscar professores" });
      }
      res.json(results);
    }
  );
});

// Rota para cadastrar um novo aluno (pelo painel do professor/coordenador)
app.post("/api/alunos", async (req, res) => {
  const { nome, matricula, senha } = req.body;

  if (!nome || !matricula || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, matrícula e senha são obrigatórios." });
  }

  try {
    const hashSenha = await bcrypt.hash(senha, 10);
    // SQL inclui todos os campos com valores padrão
    const sql = `INSERT INTO usuarios 
      (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Usando 'matricula' no campo 'cpf' e strings vazias para os demais
    const values = [
      'aluno', nome, '1900-01-01', '', matricula, '', '', '', '', '', '', '', hashSenha
    ];

    db.query(sql, values, (err) => {
      if (err) {
        console.error("Erro no banco de dados:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Aluno com esta matrícula já cadastrado." });
        }
        return res.status(500).json({ error: "Erro ao cadastrar aluno." });
      }
      res.status(201).json({ message: "Aluno cadastrado com sucesso!" });
    });
  } catch (error) {
    console.error("Erro de servidor:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para cadastrar um novo professor (pelo painel do coordenador)
app.post("/api/professores", async (req, res) => {
  const { nome, disciplina, senha } = req.body; 

  if (!nome || !disciplina || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, disciplina e senha são obrigatórios." });
  }

  try {
    const hashSenha = await bcrypt.hash(senha, 10);
    // SQL inclui todos os campos com valores padrão
    const sql = `INSERT INTO usuarios 
      (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Usando um CPF/contato genérico e strings vazias para os demais
    const values = [
      'professor', nome, '1900-01-01', disciplina, '', '', '', '', '', '', '', '', hashSenha
    ];

    db.query(sql, values, (err) => {
      if (err) {
        console.error("Erro no banco de dados:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Professor já cadastrado." });
        }
        return res.status(500).json({ error: "Erro ao cadastrar professor." });
      }
      res.status(201).json({ message: "Professor cadastrado com sucesso!" });
    });
  } catch (error) {
    console.error("Erro de servidor:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
