// app.js
//<><><><><><><><><><><><>MÓDULOS<><><><><><><><><><><><>//
const express = require('express');
const mysql = require("mysql");
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const md5 = require('md5');
const formidable = require('formidable');
const fs = require('fs-extra');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

//<><><><><><><><><><><><>CONFIGURAÇÕES<><><><><><><><><><><><>//

// Porta do servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Session
app.use(session({
    secret: 'lisamilapo',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000000 }
}));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Arquivos estáticos
app.use(express.static('public'));

// EJS
app.set('view engine', 'ejs');

//<><><><><><><><><><><><>UPLOAD DE FOTOS<><><><><><><><><><><><>//
const storageFotoPerfil = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/fotos')
    },
    filename: function (req, file, cb) {
        cb(null, `${md5(req.session.data_user['email'])}${path.extname(file.originalname)}`);
    }
});
const uploadFotoPerfil = multer({ storage: storageFotoPerfil });

//<><><><><><><><><><><><>CONEXÃO MYSQL<><><><><><><><><><><><>//
var connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.getConnection((err, conn) => {
    if (err) console.error("❌ Erro ao conectar no MySQL:", err);
    else {
        console.log("✅ MySQL conectado com sucesso!");
        conn.release();
    }
});

//<><><><><><><><><><><><>IMPORTAR MODELS<><><><><><><><><><><><>//
const UsuariosDAO = require('./models/UsuariosDAO');
const ConteudosDAO = require('./models/ConteudosDAO');
const DisciplinasDAO = require('./models/DisciplinasDAO');
const CategoriasDAO = require('./models/CategoriasDAO');
const ExtensoesDAO = require('./models/ExtensoesDAO');
const LivrosDAO = require('./models/LivrosDAO');

//<><><><><><><><><><><><>ROTAS<><><><><><><><><><><><>//

// Test DB
app.get("/test-db", (req, res) => {
    connection.query("SELECT 1", (err) => {
        if (err) return res.status(500).send("Erro no banco");
        res.send("Banco conectado com sucesso!");
    });
});

// Home
app.get('/', (req, res) => {
    if (req.session.logged) {
        res.render('homes/logado/index', { data: { user_data: req.session.data_user } });
    } else {
        res.redirect('home');
    }
});

// Index
app.get('/home', (req, res) => {
    if (req.session.logged) res.redirect('/');
    else res.render('homes/n_logado/home');
});

// Login
app.get('/login', (req, res) => {
    if (req.session.logged) res.redirect('/');
    else res.render('credenciais/login', { data: { stts: null } });
});

// Auth
app.post('/auth', (req, res) => {
    let usuarios = new UsuariosDAO();
    let caminho_foto = 'assets/icons/padraoProfile.png';
    if (!req.body.email || !req.body.password) {
        return res.render('credenciais/login', { data: { stts: "Preencha todos os campos." } });
    }
    usuarios.setEmail(req.body.email);
    usuarios.setSenha(md5(req.body.password));
    usuarios.login(connection, (resultado) => {
        if (resultado == "user_inexistente") return res.render('credenciais/login', { data: { stts: "Usuário não encontrado." } });
        if (resultado == "senha_incorreta") return res.render('credenciais/login', { data: { stts: "Senha incorreta." } });

        if (!resultado[0]['caminho_foto']) resultado[0]['caminho_foto'] = caminho_foto;
        req.session.data_user = resultado[0];
        req.session.type = resultado[0]['administrador'] ? 'administrador' : 'aluno';

        if (resultado[0]['verificado']) req.session.logged = true, res.redirect('/');
        else res.redirect('verificar');
    });
});

// Cadastro
app.get('/cadastro', (req, res) => {
    if (req.session.logged) res.redirect('/');
    else res.render('credenciais/cadastro', { data: { erro: null } });
});

// Termos
app.get('/termos', (req, res) => res.render('credenciais/termos'));

// Cadastrar
app.post('/cadastrar', (req, res) => {
    let usuarios = new UsuariosDAO();
    let { nome_completo, apelido, email, senha: senhaRaw, senhaConfirma: senhaConfirmaRaw, descricao: biografia, data_nascimento } = req.body;
    let senha = md5(senhaRaw);
    let senhaConfirma = md5(senhaConfirmaRaw);
    let dataAtual = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!nome_completo || !apelido || !email || !senhaRaw || !senhaConfirmaRaw || !data_nascimento || !biografia) {
        return res.render('credenciais/cadastro', { data: { erro: "Você não preencheu todos os campos." } });
    }
    if (senha !== senhaConfirma) return res.render('credenciais/cadastro', { data: { erro: "As senhas divergem entre si!" } });
    if ((nome_completo.split(' ')).length < 2) return res.render('credenciais/cadastro', { data: { erro: "Você não inseriu um nome completo" } });
    if ((apelido.split(' ')).length > 1) return res.render('credenciais/cadastro', { data: { erro: "O apelido precisa conter apenas uma palavra" } });
    if (senhaRaw.length < 8) return res.render('credenciais/cadastro', { data: { erro: "Sua senha não corresponde às exigências mínimas." } });

    let randomized = Math.ceil(Math.random() * Math.pow(10, 6));
    let digito = Math.ceil(Math.log(randomized));
    while (digito > 10) digito = Math.ceil(Math.log(digito));
    let cod_verificador = randomized + '-' + digito;

    req.session.cod_verificador = cod_verificador;
    usuarios.setNome_Completo(nome_completo);
    usuarios.setApelido(apelido);
    usuarios.setEmail(email);
    usuarios.setSenha(senha);
    usuarios.setSenha_Confirma(senhaConfirma);
    usuarios.setBiografia(biografia);
    usuarios.setData_Nascimento(data_nascimento);
    usuarios.setData_Atual(dataAtual);
    usuarios.setCod_Verificador(cod_verificador);

    // Enviar e-mail via SendGrid
    sgMail.send({
        to: email,
        from: 'moovickifrs@gmail.com',
        subject: 'Confirmação de Email',
        html: `<center><h3>${nome_completo}, verifique seu Email</h3></center>
               <p>Use o código abaixo:</p>
               <center><h3 style='color:red'>${cod_verificador}</h3></center>`
    })
        .then(() => {
            usuarios.cadastro(connection, (resultado) => {
                if (resultado == "user_existente") {
                    res.render('credenciais/cadastro', { data: { erro: "Já existe um usuário vinculado a esse email. Faça login." } });
                } else if (resultado[0]['email'] == email) {
                    req.session.data_user = resultado[0];
                    req.session.type = 'aluno';
                    res.redirect('verificar');
                } else res.render('credenciais/cadastro', { data: { erro: "Ocorreu um problema durante seu cadastro." } });
            });
        })
        .catch(err => {
            console.log(err);
            res.render('credenciais/cadastro', { data: { erro: "Não foi possível enviar o email." } });
        });
});

// Verificar e-mail
app.get('/verificar', (req, res) => res.render('credenciais/verificar', { data: {} }));

app.post('/verificar', (req, res) => {
    let cod_verificador = req.body.codigo;
    let id = req.session.data_user['id'];
    if (!cod_verificador) return res.render('credenciais/verificar', { data: { erro: "Insira um código" } });

    connection.query("SELECT * FROM usuarios WHERE id = ?", [id], (erro, resultado) => {
        if (erro) return console.log(erro);
        if (cod_verificador == resultado[0]['cod_verificador']) {
            connection.query("UPDATE usuarios SET verificado = true WHERE id = ?", [id], (erro) => {
                if (erro) res.send(erro);
                else { req.session.logged = true; res.redirect('/'); }
            });
        } else {
            res.render('credenciais/verificar', { data: { erro: "Código incorreto" } });
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    if (req.session.logged) delete req.session.logged;
    res.redirect('/');
});

//<><><><><><><><><><><><>DISCIPLINAS E CONTEÚDOS<><><><><><><><><><><><>//

// Disciplinas
app.get('/disciplinas', (req, res) => {
    if (!req.session.logged) return res.redirect('home');
    res.render('disciplinas/all', { data: { user_data: req.session.data_user } });
});

// Disciplina individual
app.get('/viewDisciplina', (req, res) => {
    if (!req.session.logged) return res.redirect('home');

    const { id: disciplina, categoria, tipo, user, busca } = req.query;
    if (!disciplina) return res.redirect('/');

    let usuarios = new UsuariosDAO();
    let disciplinas = new DisciplinasDAO();
    let categoriasDAO = new CategoriasDAO();
    let extensoes = new ExtensoesDAO();
    let conteudos = new ConteudosDAO();

    disciplinas.setID(disciplina);
    conteudos.setDisciplina(disciplina);
    categoriasDAO.setDisciplina(disciplina);

    disciplinas.busca(connection, (dadosDisciplina) => {
        if (!dadosDisciplina) return res.redirect('/');
        usuarios.buscaAdmin(connection, (users) => {
            categoriasDAO.busca(connection, (categorias) => {
                extensoes.busca(connection, (extensoesDados) => {

                    if (busca) {
                        conteudos.setTextoBusca("%" + busca + "%");
                        conteudos.buscaPorPalavraChave(connection, (resultado) => {
                            res.render('disciplinas/view', {
                                data: {
                                    user_data: req.session.data_user,
                                    allconteudos: resultado.length ? resultado : null,
                                    categorias,
                                    idDisciplina: disciplina,
                                    users,
                                    extensoes: extensoesDados,
                                    dadosDisciplina
                                }
                            });
                        });
                    } else {
                        conteudos.buscaGeral(connection, (resultado) => {
                            if (!resultado[0]) resultado = null;
                            else {
                                // Filtros combinados
                                resultado = resultado.filter(c => {
                                    return (!user || c.criadorId == user) &&
                                        (!categoria || c.categoriaID == categoria) &&
                                        (!tipo || c.extensaoID == tipo);
                                });
                            }
                            res.render('disciplinas/view', {
                                data: {
                                    user_data: req.session.data_user,
                                    allconteudos: resultado,
                                    categorias,
                                    idDisciplina: disciplina,
                                    users,
                                    extensoes: extensoesDados,
                                    dadosDisciplina
                                }
                            });
                        });
                    }

                });
            });
        });
    });
});

// Novo conteúdo (formulário)
app.get('/novo', (req, res) => {
    if (!req.session.logged || req.session.type !== "administrador") return res.redirect('/');
    const { disciplina } = req.query;
    if (!disciplina) return res.redirect('/');
    let disciplinas = new DisciplinasDAO();
    let categoriasDAO = new CategoriasDAO();
    disciplinas.setID(disciplina);
    categoriasDAO.setDisciplina(disciplina);

    disciplinas.busca(connection, (dadosDisciplina) => {
        categoriasDAO.busca(connection, (categorias) => {
            res.render('disciplinas/novo', {
                data: {
                    user_data: req.session.data_user,
                    dadosDisciplina,
                    categorias
                }
            });
        });
    });
});

// Adicionar conteúdo (POST)
app.post('/addConteudo', (req, res) => {
    if (!req.session.logged || req.session.type !== "administrador") return res.redirect('/');
    const { disciplina } = req.query;
    if (!disciplina) return res.redirect('/');
    let conteudos = new ConteudosDAO();
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        if (err) return res.send("Erro no upload");

        const extensao = path.extname(files.file.name).toLowerCase();
        let extensaoID;
        switch (extensao) {
            case '.txt': extensaoID = 1; break;
            case '.doc': extensaoID = 2; break;
            case '.pdf': extensaoID = 3; break;
            case '.ppt': extensaoID = 4; break;
            case '.jpeg': extensaoID = 5; break;
            case '.jpg': extensaoID = 6; break;
            case '.png': extensaoID = 7; break;
            case '.docx': extensaoID = 8; break;
            case '.pptx': extensaoID = 9; break;
            default: return res.send('Extensão não suportada.');
        }

        const { titulo, categoria, resumo: descricao } = fields;
        if (!titulo || !categoria || !descricao) return res.send('Preencha todos os campos');

        const data_upload = new Date();
        const caminho_arquivo = md5(data_upload.getTime()) + extensao;

        conteudos.setTitulo(titulo);
        conteudos.setCriador(req.session.data_user['id']);
        conteudos.setDisciplina(disciplina);
        conteudos.setCategoria(categoria);
        conteudos.setData_upload(data_upload.toLocaleDateString());
        conteudos.setDescricao(descricao);
        conteudos.setCaminho_arquivo(caminho_arquivo);
        conteudos.setExtensaoID(extensaoID);

        conteudos.cadastrarConteudo(connection, (resultado) => {
            if (resultado === true) {
                fs.move(files.file.path, 'public/uploads/conteudos/' + caminho_arquivo, err => {
                    if (err) throw err;
                    res.redirect("/viewDisciplina?id=" + disciplina);
                });
            } else res.redirect('/');
        });
    });
});

// Excluir conteúdo
app.get("/excluirConteudo", (req, res) => {
    if (!req.session.logged || req.session.type !== "administrador") return res.render('erro');
    const { id: idConteudo, idDisciplina } = req.query;
    if (!idConteudo || !idDisciplina) return res.render('erro');

    let conteudos = new ConteudosDAO();
    conteudos.setId(idConteudo);
    conteudos.buscaId(connection, (buscado) => {
        if (!buscado[0]) return res.render("erro");
        conteudos.excluirConteudo(connection, () => {
            fs.unlink('public/uploads/conteudos/' + buscado[0].caminho_arquivo, (err) => {
                if (err) res.render('erro');
                else res.redirect('/viewDisciplina?id=' + idDisciplina);
            });
        });
    });
});

// Gerenciador de Categorias
app.get('/minhasCategorias', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const categoriasDAO = new CategoriasDAO();
    const disciplinasDAO = new DisciplinasDAO();
    const id = req.session.data_user['id'];

    categoriasDAO.setCriador(id);
    categoriasDAO.buscaCriador(connection, (categorias) => {
        disciplinasDAO.buscaGeral(connection, (dadosDisciplina) => {
            res.render('disciplinas/gerenciadorCategorias', {
                data: {
                    categorias,
                    disciplinas: dadosDisciplina,
                    erro: req.query.erro,
                    sucesso: req.query.sucesso,
                    user_data: req.session.data_user,
                    user_perfil: req.session.data_user
                }
            });
        });
    });
});

// Adicionar categoria
app.post('/adicionarCategoria', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const { titulo, disciplina } = req.body;
    if (!titulo || !disciplina) return res.render('erro');

    const categoriasDAO = new CategoriasDAO();
    categoriasDAO.setCriador(req.session.data_user['id']);
    categoriasDAO.setDisciplina(disciplina);
    categoriasDAO.setTitulo(titulo);
    categoriasDAO.inserirCategoria(connection, (resultado) => {
        if (resultado === true) res.redirect('/minhasCategorias');
        else res.render('erro');
    });
});

// Deletar categoria
app.get('/deletarCategoria', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const idCat = req.query.id;
    if (!idCat) return res.redirect('/');

    connection.query('SELECT * FROM categorias WHERE id = ?', [idCat], (err, resultado) => {
        if (err) return res.send("Erro no servidor");
        if (resultado[0].criador != req.session.data_user['id']) return res.redirect('/');
        connection.query('SELECT * FROM conteudos WHERE categoria = ?', [idCat], (err, conteudos) => {
            if (err) return res.send("Erro no servidor");
            if (conteudos[0]) return res.redirect('/minhasCategorias?erro=1'); // Categoria com conteúdos
            connection.query('DELETE FROM categorias WHERE id = ?', [idCat], () => res.redirect('/minhasCategorias'));
        });
    });
});

// Perfis
app.get('/userProfile', (req, res) => {
    if (!req.session.logged) return res.redirect('home');
    const { id } = req.query;
    if (!id) return res.redirect('home');

    const usuariosDAO = new UsuariosDAO();
    const conteudosDAO = new ConteudosDAO();
    usuariosDAO.setID(id);
    conteudosDAO.setCriador(id);

    usuariosDAO.busca(connection, (dados_perfil) => {
        if (dados_perfil == "user_inexistente") return res.render("erro");
        conteudosDAO.buscaPorUser(connection, (num_conteudos) => {
            dados_perfil[0].numero_de_conteudos = num_conteudos;
            res.render('perfil/perfil', { data: { erro: req.query.erro, sucesso: req.query.sucesso, user_data: req.session.data_user, user_perfil: dados_perfil[0] } });
        });
    });
});

// Atualizar foto do usuário
app.post("/mudarFotoUsuario", uploadFotoPerfil.single("fotoPerfil"), (req, res) => {
    if (!req.file) return res.send("Nenhum arquivo enviado");
    const usuariosDAO = new UsuariosDAO();
    const ext = path.extname(req.file.filename).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        fs.unlink(req.file.path);
        return res.send("Formato não suportado");
    }
    const caminho_foto = "uploads/fotos/" + md5(req.session.data_user['email']) + ext;
    usuariosDAO.setFoto(caminho_foto);
    usuariosDAO.setID(req.session.data_user['id']);
    usuariosDAO.atualizarFoto(connection, (resultado) => {
        if (resultado === true) {
            req.session.data_user['caminho_foto'] = caminho_foto;
            res.redirect('/userProfile?id=' + req.session.data_user['id']);
        } else res.send("Erro");
    });
});

// Atualizar dados do usuário
app.post("/mudarDados", (req, res) => {
    if (!req.session.logged) return res.redirect('home');
    const { senha, senhaConfirma, descricao: biografia, apelido } = req.body;
    const usuariosDAO = new UsuariosDAO();
    const id = req.session.data_user['id'];

    if (!apelido || (apelido.split(' ').length > 1)) return res.redirect('/userProfile?id=' + id + '&erro=true');
    if (!biografia) return res.redirect('/userProfile?id=' + id + '&erro=true');

    usuariosDAO.setID(id);
    usuariosDAO.setApelido(apelido);
    usuariosDAO.setBiografia(biografia);

    if (senha && senhaConfirma) {
        if (senha.length < 8 || senha !== senhaConfirma) return res.redirect('/userProfile?id=' + id + '&erro=true');
        usuariosDAO.setSenha(md5(senha));
    }

    usuariosDAO.atualizarDados(connection, (resultado) => {
        if (resultado === true) {
            req.session.data_user['biografia'] = biografia;
            req.session.data_user['apelido'] = apelido;
            if (senha && senhaConfirma) req.session.data_user['senha'] = md5(senha);
            res.redirect('/userProfile?id=' + id + '&sucesso=true');
        } else res.send("Erro");
    });
});

// Biblioteca
app.get('/biblioteca', (req, res) => {
    if (!req.session.logged) return res.redirect('home');
    const livrosDAO = new LivrosDAO();
    const busca = req.query.busca;
    if (busca) {
        livrosDAO.setTextoBusca(busca);
        livrosDAO.buscaPorTexto(connection, (livros) => {
            res.render('biblioteca/leituras', { data: { livros: livros.length ? livros : null, user_data: req.session.data_user } });
        });
    } else {
        connection.query("SELECT livros.id, livros.titulo, livros.autor, livros.ano, livros.caminho_capa, livros.caminho_arquivo, usuarios.apelido, usuarios.id as idUser FROM livros INNER JOIN usuarios ON livros.criador = usuarios.id", (err, resultado) => {
            if (err) return res.send(err);
            res.render('biblioteca/leituras', { data: { livros: resultado, user_data: req.session.data_user } });
        });
    }
});

// ==================== LIVROS (UPLOAD / DOWNLOAD / EXCLUSÃO) ====================

// Formulário novo livro
app.get('/novoLivro', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    res.render('biblioteca/novo', {
        data: {
            user_data: req.session.data_user
        }
    });
});

// Adicionar livro
app.post('/addLivro', upload.single('arquivo'), (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');

    const { titulo, autor, ano } = req.body;
    if (!titulo || !autor || !ano || !req.file) return res.render('erro');

    const livrosDAO = new LivrosDAO();
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
        fs.unlinkSync(req.file.path);
        return res.send('Somente PDF permitido');
    }

    const caminho = 'uploads/livros/' + md5(Date.now()) + '.pdf';

    livrosDAO.setTitulo(titulo);
    livrosDAO.setAutor(autor);
    livrosDAO.setAno(ano);
    livrosDAO.setCriador(req.session.data_user.id);
    livrosDAO.setCaminhoArquivo(caminho);

    livrosDAO.inserirLivro(connection, (ok) => {
        if (ok === true) {
            fs.rename(req.file.path, 'public/' + caminho, () => {
                res.redirect('/biblioteca');
            });
        } else res.render('erro');
    });
});

// Download livro
app.get('/downloadLivro', (req, res) => {
    if (!req.session.logged) return res.redirect('/');
    const { id } = req.query;
    if (!id) return res.redirect('/');

    connection.query('SELECT caminho_arquivo FROM livros WHERE id = ?', [id], (err, r) => {
        if (err || !r[0]) return res.render('erro');
        res.download('public/' + r[0].caminho_arquivo);
    });
});

// Excluir livro
app.get('/excluirLivro', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const { id } = req.query;

    connection.query('SELECT caminho_arquivo FROM livros WHERE id = ?', [id], (err, r) => {
        if (err || !r[0]) return res.render('erro');
        connection.query('DELETE FROM livros WHERE id = ?', [id], () => {
            fs.unlink('public/' + r[0].caminho_arquivo, () => {
                res.redirect('/biblioteca');
            });
        });
    });
});


// ==================== ADMIN ====================

// Painel admin
app.get('/admin', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    res.render('admin/painel', {
        data: {
            user_data: req.session.data_user
        }
    });
});

// Listar usuários
app.get('/adminUsuarios', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    connection.query('SELECT * FROM usuarios', (err, usuarios) => {
        if (err) return res.render('erro');
        res.render('admin/usuarios', {
            data: {
                usuarios,
                user_data: req.session.data_user
            }
        });
    });
});

// Tornar admin
app.get('/tornarAdmin', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const { id } = req.query;
    if (!id) return res.redirect('/adminUsuarios');

    connection.query('UPDATE usuarios SET administrador = true WHERE id = ?', [id], () => {
        res.redirect('/adminUsuarios');
    });
});

// Remover admin
app.get('/removerAdmin', (req, res) => {
    if (!req.session.logged || req.session.type !== 'administrador') return res.redirect('/');
    const { id } = req.query;
    if (!id) return res.redirect('/adminUsuarios');

    connection.query('UPDATE usuarios SET administrador = false WHERE id = ?', [id], () => {
        res.redirect('/adminUsuarios');
    });
});


// ==================== ERROS ====================

app.use((req, res) => {
    res.status(404).render('erro404');
});


// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});


