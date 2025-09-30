const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // pasta onde os documentos serão salvos
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

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

app.put("/api/atualizar-tipo", (req, res) => {
  const { id, tipo } = req.body;

  if (!id || !tipo) {
    return res.status(400).json({ error: "ID e novo tipo são obrigatórios." });
  }

  const sql = "UPDATE usuarios SET tipo = ? WHERE id = ?";

  db.query(sql, [tipo, id], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar o tipo de usuário:", err);
      return res.status(500).json({ error: "Erro ao atualizar o tipo de usuário." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.status(200).json({ message: "Tipo de usuário atualizado com sucesso!" });
  });
});

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

app.post("/api/alunos", async (req, res) => {
  const { nome, matricula, senha } = req.body;

  if (!nome || !matricula || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, matrícula e senha são obrigatórios." });
  }

  try {
    const hashSenha = await bcrypt.hash(senha, 10);
    const sql = `INSERT INTO usuarios 
      (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

app.post("/api/professores", async (req, res) => {
  const { nome, disciplina, senha } = req.body; 

  if (!nome || !disciplina || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, disciplina e senha são obrigatórios." });
  }

  try {
    const hashSenha = await bcrypt.hash(senha, 10);
    const sql = `INSERT INTO usuarios 
      (tipo, nome, data_nascimento, contato, cpf, rg, cidade, endereco, estado_civil, sexo, nome_pai, nome_mae, senha) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

app.post("/api/bancas", (req, res) => {
    const { alunoId, professor1Id, professor2Id, professor3Id } = req.body;

    if (!alunoId || !professor1Id || !professor2Id || !professor3Id) {
        return res.status(400).json({ error: "Dados da banca incompletos." });
    }

    const sql = `
        INSERT INTO bancas (aluno_id, professor1_id, professor2_id, professor3_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [alunoId, professor1Id, professor2Id, professor3Id], (err) => {
        if (err) {
            console.error("Erro ao salvar a banca:", err);
            return res.status(500).json({ error: "Erro ao salvar a banca no banco de dados." });
        }
        res.status(201).json({ message: "Banca salva com sucesso!" });
    });
});

app.get("/api/bancas/:alunoId", (req, res) => {
    const { alunoId } = req.params;

    const sql = `
        SELECT aluno_id, professor1_id, professor2_id, professor3_id
        FROM bancas
        WHERE aluno_id = ?
        LIMIT 1
    `;

    db.query(sql, [alunoId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar a banca:", err);
            return res.status(500).json({ error: "Erro ao buscar a banca no banco de dados." });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Banca não encontrada para este aluno." });
        }
        res.status(200).json(results[0]);
    });
});

app.post("/api/notas", async (req, res) => {
    const { alunoId, professorId, dadosNotas } = req.body;

    if (!alunoId || !professorId || !dadosNotas || dadosNotas.length === 0) {
        return res.status(400).json({ error: "Dados de notas incompletos." });
    }

    try {
        const sql = `INSERT INTO notas (aluno_id, professor_id, criterio, nota) VALUES ?`;

        const values = dadosNotas.map(notaData => [alunoId, professorId, notaData.criterio, notaData.nota]);

        db.query(sql, [values], (err) => {
            if (err) {
                console.error("Erro ao inserir notas:", err);
                return res.status(500).json({ error: "Erro ao inserir notas no banco de dados." });
            }
            res.status(201).json({ message: "Notas lançadas com sucesso!" });
        });
    } catch (error) {
        console.error("Erro interno do servidor ao lançar notas:", error);
        res.status(500).json({ error: "Erro interno do servidor ao lançar notas." });
    }
});

app.get("/api/notas/:alunoId", (req, res) => {
    const { alunoId } = req.params;

    const sql = `
        SELECT 
            n.criterio, 
            n.nota, 
            n.data_lancamento,
            p.nome AS professor_nome
        FROM notas AS n
        JOIN usuarios AS p ON n.professor_id = p.id
        WHERE n.aluno_id = ? 
        ORDER BY n.data_lancamento DESC`;

    db.query(sql, [alunoId], (err, results) => {
        if (err) {
            console.error("Erro ao buscar notas:", err);
            return res.status(500).json({ error: "Erro ao buscar notas no banco de dados." });
        }
        res.status(200).json(results);
    });
});

app.post("/api/reunioes", upload.single("documento"), (req, res) => {
  const { alunoId, professorId, data, descricao } = req.body;
  const documento = req.file ? req.file.filename : null;

  if (!alunoId || !professorId || !data) {
    return res.status(400).json({ error: "Aluno, professor e data são obrigatórios." });
  }

  const sql = `INSERT INTO reunioes (aluno_id, professor_id, data, descricao, documento) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [alunoId, professorId, data, descricao, documento], (err) => {
    if (err) {
      console.error("Erro ao registrar reunião:", err);
      return res.status(500).json({ error: "Erro ao registrar reunião" });
    }
    res.json({ message: "Reunião registrada com sucesso!" });
  });
});

app.get("/api/reunioes/professor/:id", (req, res) => {
  const professorId = req.params.id;
  const sql = `
    SELECT r.*, u.nome AS aluno_nome
    FROM reunioes r
    JOIN usuarios u ON r.aluno_id = u.id
    WHERE r.professor_id = ?
    ORDER BY r.data DESC
  `;
  db.query(sql, [professorId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao buscar reuniões." });
    }
    res.json(results);
  });
});

app.get("/api/reunioes/aluno/:alunoId", (req, res) => {
  const { alunoId } = req.params;

  const sql = `
    SELECT r.*, p.nome AS professor_nome 
    FROM reunioes r
    JOIN usuarios p ON r.professor_id = p.id
    WHERE r.aluno_id = ?
    ORDER BY r.data ASC, r.hora ASC
  `;

  db.query(sql, [alunoId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar reuniões:", err);
      return res.status(500).json({ error: "Erro ao buscar reuniões." });
    }
    res.status(200).json(results);
  });
});

app.post("/api/cronogramas", (req, res) => {
  const { alunoId, tipoEntrega, dataEntrega, horaEntrega } = req.body;

  if (!alunoId || !tipoEntrega || !dataEntrega || !horaEntrega) {
    return res.status(400).json({ error: "Preencha todos os campos do cronograma." });
  }

  const sql = `
    INSERT INTO cronogramas (aluno_id, tipoEntrega, dataEntrega, horaEntrega)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [alunoId, tipoEntrega, dataEntrega, horaEntrega], (err) => {
    if (err) {
      console.error("Erro ao salvar cronograma:", err);
      return res.status(500).json({ error: "Erro ao salvar cronograma no banco de dados." });
    }
    res.status(201).json({ message: "Cronograma definido com sucesso!" });
  });
});

app.get("/api/cronogramas", (req, res) => {
  const sql = `
    SELECT c.id, u.nome AS aluno_nome, c.tipoEntrega, c.dataEntrega, c.horaEntrega, c.data_definicao
    FROM cronogramas c
    JOIN usuarios u ON c.aluno_id = u.id
    ORDER BY c.dataEntrega ASC, c.horaEntrega ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar cronogramas:", err);
      return res.status(500).json({ error: "Erro ao buscar cronogramas no banco de dados." });
    }
    res.status(200).json(results);
  });
});

app.get("/api/cronogramas/:alunoId", (req, res) => {
  const { alunoId } = req.params;

  const sql = `
    SELECT c.id, u.nome AS aluno_nome, c.tipoEntrega, c.dataEntrega, c.horaEntrega, c.data_definicao
    FROM cronogramas c
    JOIN usuarios u ON c.aluno_id = u.id
    WHERE c.aluno_id = ?
    ORDER BY c.dataEntrega ASC, c.horaEntrega ASC
  `;

  db.query(sql, [alunoId], (err, results) => {
    if (err) {
      console.error("Erro ao buscar cronogramas do aluno:", err);
      return res.status(500).json({ error: "Erro ao buscar cronogramas do aluno." });
    }
    res.status(200).json(results);
  });
});

app.post("/api/uploads", upload.single("documento"), (req, res) => {
  const { usuarioId } = req.body;
  const arquivo = req.file;

  if (!usuarioId || !arquivo) {
    return res.status(400).json({ error: "Usuário e arquivo são obrigatórios." });
  }

  const sql = "INSERT INTO uploads (usuario_id, nome_arquivo) VALUES (?, ?)";
  db.query(sql, [usuarioId, arquivo.filename], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao salvar upload no banco." });
    }
    res.json({ message: "Documento enviado com sucesso!" });
  });
});

app.get("/api/uploads/:usuarioId", (req, res) => {
  const { usuarioId } = req.params;
  const sql = "SELECT * FROM uploads WHERE usuario_id = ?";
  db.query(sql, [usuarioId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao buscar uploads." });
    }
    res.json(results);
  });
});
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
