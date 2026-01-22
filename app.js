//<><><><><><><><><><><><>MÓDULOS<><><><><><><><><><><><>//

const express = require('express');
const mysql = require("mysql");
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const md5 = require('md5');
const formidable = require('formidable');
const busboy = require('connect-busboy');
const fs = require('fs-extra');
const { connect } = require('http2');
const { unlink } = require('fs');
const { verify } = require('crypto');

//<><><><><><><><><><><><>CONFIGURAÇÕES DE MÓDULOS<><><><><><><><><><><><>//

//Mensagem de escuta

app.listen(3000, function() {
    console.log("Servidor no ar rodando na porta 3000.")
});

//Configuração do módulo 'Session'
app.use(session({
    secret: 'lisamilapo',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000000 }
}))
app.use(function(req, res, next) {
    const sessaoID = req.sessionID;
    next()
});

//Consiguração do módulo 'Body-Parser'
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Configuração do módulo 'Express'
app.use(express.static('public'));

//Configuração do módulo 'ejs'
app.set('view engine', 'ejs');

//1.0: Armazenamento de Fotos de usuário
const storageFotoPerfil = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/fotos')
    },
    filename: function(req, file, cb) {
        cb(null, `${md5(req.session.data_user['email'])}${path.extname(file.originalname)}`);
    },
    fileFilter: (req, file, cb) => {
        const isAccepted = ['image/png', 'image/jpg', 'image/jpeg'].find(formatoAceito => formatoAceito == file.mimetype);
        if (isAccepted) {
            return cb(null, true);
        }
        return cb(null, false);
    }
});
const uploadFotoPerfil = multer({ storage: storageFotoPerfil });

//<><><><><><><><><><><><>CONEXÃO COM O BANCO DE DADOS<><><><><><><><><><><><>//
var connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.getConnection((err, conn) => {
    if (err) {
        console.error("❌ Erro ao conectar no MySQL:", err);
    } else {
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
const { kMaxLength } = require('buffer');
const { json } = require('body-parser');
const { JSONParser } = require('formidable');

//<><><><><><><><><><><><>PÁGINAS INICIAIS<><><><><><><><><><><><>//

// 1. Rota de teste conexão DB externa. 
app.get("/test-db", (req, res) => {
  connection.query("SELECT 1", (err, results) => {
    if (err) {
      return res.status(500).send("Erro no banco");
    }
    res.send("Banco conectado com sucesso!");
  });
});
});

// 1. Rota do Home (página estática de boas-vindas)
app.get('/', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == 'administrador') {
            res.render('homes/logado/index', {
                data: {
                    user_data: req.session.data_user,
                }
            });
        } else {
            res.render('homes/logado/index', {
                data: {
                    user_data: req.session.data_user,
                }
            });
        }
    } else {
        res.redirect('home');
    }
});
// 2. Rota do index (já logado)  
app.get('/home', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('homes/n_logado/home');
    }
});
// 3. Rota do Login
app.get('/login', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('credenciais/login', {
            data: {
                stts: null,
            }
        });
    }
});
// 3.1 POST de autenticação auth (Login)
app.post('/auth', function(req, res) {
    let usuarios = new UsuariosDAO();
    let caminho_foto = 'assets/icons/padraoProfile.png';
    if (req.body.email && req.body.password) {
        usuarios.setEmail(req.body.email);
        usuarios.setSenha(md5(req.body.password));
        usuarios.login(connection, function(resultado) {
            if (resultado == "user_inexistente") {
                res.render('credenciais/login', {
                    data: {
                        stts: "Usuário não encontrado.",
                    }
                });
            } else if (resultado == "senha_incorreta") {
                res.render('credenciais/login', {
                    data: {
                        stts: "Senha incorreta.",
                    }
                });
            } else {
                //Define uma imagem de perfil provisória, caso o usuário não tenha feito upload de uma
                if (!resultado[0]['caminho_foto']) {
                    resultado[0]['caminho_foto'] = caminho_foto;
                }
                //Se o usuário for um professor
                if (resultado[0]['administrador'] == 1) {
                    //Passa os parâmetros para a sessão
                    req.session.data_user = resultado[0];
                    req.session.type = 'administrador';
                    //Se o usuário for aluno
                } else {
                    //Passa os parâmetros para a sessão
                    req.session.data_user = resultado[0];
                    req.session.type = 'aluno';
                }
                //Faz os redirecionamentos
                if (resultado[0]['verificado'] == true) {
                    req.session.logged = true;
                    res.redirect('/');
                } else {
                    res.redirect('verificar')
                }
            }
        });
    } else {
        res.render('credenciais/login', {
            data: {
                stts: "Preencha todos os campos.",
            }
        });
    }

});

// 4. Rota de Cadastro 
app.get('/cadastro', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('credenciais/cadastro', {
            data: {
                erro: null
            }
        });
    }
});
//4.1 termo
app.get('/termos', (req, res) => {
    res.render('credenciais/termos')
});
// 4.2 POST de autenticação cadastrar (Cadastro)
app.post('/cadastrar', function(req, res) {
    let usuarios = new UsuariosDAO();
    let nome_completo = req.body.nome_completo;
    let apelido = req.body.apelido;
    let email = req.body.email;
    let senha = md5(req.body.senha);
    let senhaConfirma = md5(req.body.senhaConfirma);
    let biografia = req.body.descricao;
    let data_nascimento = req.body.data_nascimento;
    let data = new Date;
    let dataAtual = data.getFullYear() + "-" + data.getMonth() + "-" + data.getDate();
    if (!nome_completo || !apelido || !email || !senha || !senhaConfirma || !data_nascimento || !biografia) {
        res.render('credenciais/cadastro', {
            data: {
                erro: "Você não preencheu todos os campos."
            }
        });
    } else {
        usuarios.setNome_Completo(nome_completo);
        usuarios.setApelido(apelido);
        usuarios.setEmail(email);
        usuarios.setSenha(senha);
        usuarios.setSenha_Confirma(senhaConfirma);
        usuarios.setBiografia(biografia);
        usuarios.setData_Nascimento(data_nascimento);
        usuarios.setData_Atual(dataAtual);
        let randomized = Math.ceil(Math.random() * Math.pow(10, 6));
        var digito = Math.ceil(Math.log(randomized));
        while (digito > 10) {
            digito = Math.ceil(Math.log(digito));
        }
        var cod_verificador = randomized + '-' + digito;
        req.session.cod_verificador = cod_verificador;
        usuarios.setCod_Verificador(cod_verificador);
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'moovickifrs@gmail.com',
                pass: 'moovick2020'
            },
            tls: {
                rejectUnauthorized: false
            }

        })

        if (senha != senhaConfirma) {
            res.render('credenciais/cadastro', {
                data: {
                    erro: "As senhas divergem entre si!"
                }
            });
        } else if ((nome_completo.split(' ')).length < 2) {
            res.render('credenciais/cadastro', {
                data: {
                    erro: "Você não inseriu um nome completo"
                }
            });
        } else if ((apelido.split(' ')).length > 1) {
            res.render('credenciais/cadastro', {
                data: {
                    erro: "O apelido precisa conter apenas uma palavra"
                }
            });
        } else if (senha.length < 8) {
            res.render('credenciais/cadastro', {
                data: {
                    erro: "Sua senha não corresponde às exigências mínimas."
                }
            });
        } else {

            transporter.sendMail({
                from: 'Equipe Moovick <moovickifrs@gmail.com>',
                to: email,
                subject: 'Confirmação de Email',
                html: "<body style='height: 100%; width: 100%'><center><h3  style='color: black; margin: 1rem;'>" + nome_completo + ", verifique seu Email</h3></center><br/><p style='color: black; margin: 1rem'>Uma verificação de suas credenciais é necessária para garantir a segurança de quem utiliza a plataforma. Utilize o código abaixo para prosseguir usando sua conta no Moovick. Se não tentou fazer login no Moovick, por favor, ignore este email.</p><br/><br/><center><h3 style='color: red'>" + cod_verificador + "</h3><center><body>"
            }).then(message => {
                console.log(message);
                usuarios.cadastro(connection, function(resultado) {
                    if (resultado == "user_existente") {
                        res.render('credenciais/cadastro', {
                            data: {
                                erro: "Já existe um usuário vinculado a esse email. Faça login na página inicial."
                            }
                        });
                    } else if (resultado[0]['email'] == email) {
                        req.session.data_user = resultado[0];
                        req.session.type = 'aluno';
                        res.redirect('verificar')
                    } else {
                        res.render('credenciais/cadastro', {
                            data: {
                                erro: "Ocorreu um problema durante seu cadastro. Pedimos desculpas pelo inconveniente."
                            }
                        });
                    }
                });

            }).catch(err => {
                console.log(err);
                res.render('credenciais/cadastro', {
                    data: {
                        erro: "Email inválido."
                    }
                });
            });
        }
    }
});
//4.1.1 Email de Verificação 
app.get('/verificar', function(req, res) {
    res.render('credenciais/verificar', {
        data: {}
    });
});
//4.1.2 Post de verificação
app.post('/verificar', function(req, res) {
    let cod_verificador = req.body.codigo;
    let id = req.session.data_user['id'];
    if (cod_verificador) {
        connection.query("select * from usuarios where id = ?", [id], (erro, resultado) => {
            if (erro) {
                console.log(erro);
            } else {
                if (cod_verificador == resultado[0]['cod_verificador']) {
                    connection.query("update usuarios set verificado = true where id = ?", [id], (erro) => {
                        if (erro) {
                            res.send(erro)
                        } else {
                            req.session.logged = true;
                            res.redirect('/');
                        }
                    })
                } else {
                    res.render('credenciais/verificar', {
                        data: {
                            erro: "Código incorreto"
                        }
                    });
                }
            }
        })
    } else {
        res.render('credenciais/verificar', {
            data: {
                erro: "Insira um código"
            }
        });
    }
});
// 4.2 Logout 
app.get('/logout', function(req, res) {
    if (req.session.logged) {
        delete req.session.logged
        res.redirect('/')
    } else {
        res.redirect('/')
    }
});
//4.4 Introdução
app.get('/intro', (req, res) => {
    if (req.session.logged) {
        res.render('credenciais/intro')
    }
});



//<><><><><><><><><><><><>DISCIPLINAS E CONTEÚDOS<><><><><><><><><><><><>///



// 5. Rota da página de seleção das Disciplinas
app.get('/disciplinas', function(req, res) {
    if (req.session.logged == true) {
        res.render('disciplinas/all', {
            data: {
                user_data: req.session.data_user
            }
        });
    } else {
        res.redirect('home');
    }
});
//6. Rota da disciplina individual
app.get('/viewDisciplina', function(req, res) {
    if (req.session.logged == true) {
        let categoria = req.query.categoria;
        let tipo = req.query.tipo;
        let user = req.query.user;
        let busca = req.query.busca;
        let disciplina = req.query.id;
        let usuarios = new UsuariosDAO();
        let disciplinas = new DisciplinasDAO();
        let categorias = new CategoriasDAO();
        let extensoes = new ExtensoesDAO();
        let conteudos = new ConteudosDAO();
        disciplinas.setID(req.query.id);
        conteudos.setDisciplina(req.query.id);
        categorias.setDisciplina(req.query.id);

        if (req.query.id) {
            disciplinas.busca(connection, function(dadosDisciplina) {
                if (dadosDisciplina) {
                    usuarios.buscaAdmin(connection, function(users) {
                        categorias.busca(connection, function(categorias) {
                            extensoes.busca(connection, function(extensoes) {
                                //Caso o usuário digite algum texto no campo de busca
                                if (busca) {
                                    busca = "%" + busca + "%";
                                    conteudos.setTextoBusca(busca);
                                    conteudos.buscaPorPalavraChave(connection, function(resultado) {
                                        if (!resultado[0]) {
                                            resultado = null;
                                        }
                                        res.render('disciplinas/view', {
                                            data: {
                                                user_data: req.session.data_user,
                                                allconteudos: resultado,
                                                categorias: categorias,
                                                idDisciplina: disciplina,
                                                users: users,
                                                extensoes: extensoes,
                                                dadosDisciplina: dadosDisciplina
                                            }
                                        });
                                    });

                                } else {
                                    //Busca dinâmica (pode ou não usar os filtros)
                                    conteudos.buscaGeral(connection, function(resultado) {
                                        if (!resultado[0]) {
                                            resultado = null;
                                        } else {
                                            let temp = [];
                                            let cont = 0;
                                            if (user && categoria && tipo) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['criadorId'] == user) && (resultado[i]['categoriaID'] == categoria) && (resultado[i]['extensaoID']) == tipo) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (user && categoria) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['criadorId'] == user) && (resultado[i]['categoriaID'] == categoria)) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (user && tipo) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['criadorId'] == user) && (resultado[i]['extensaoID']) == tipo) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (user) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['criadorId'] == user)) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (categoria && tipo) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['categoriaID'] == categoria) && (resultado[i]['extensaoID']) == tipo) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (categoria) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['categoriaID'] == categoria)) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            } else if (tipo) {
                                                for (i = 0; i < resultado.length; i++) {
                                                    if ((resultado[i]['extensaoID']) == tipo) {
                                                        temp[cont] = resultado[i];
                                                        cont++;
                                                    }
                                                };
                                                resultado = temp;
                                            }
                                        }
                                        res.render('disciplinas/view', {
                                            data: {
                                                user_data: req.session.data_user,
                                                allconteudos: resultado,
                                                categorias: categorias,
                                                idDisciplina: disciplina,
                                                users: users,
                                                extensoes: extensoes,
                                                dadosDisciplina: dadosDisciplina
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    });
                } else {
                    res.redirect("/")
                }
            });
        } else {
            res.redirect("/")
        }
    } else {
        res.redirect('home');
    }
});

// 7. Adicionar um conteúdo (página do formulário)
app.get('/novo', function(req, res) {
    let disciplinas = new DisciplinasDAO();
    let categorias = new CategoriasDAO();
    disciplinas.setID(req.query.disciplina);
    categorias.setDisciplina(req.query.disciplina);
    if (req.session.logged == true) {
        if (req.session.type == "administrador") {
            if (req.query.disciplina) {
                disciplinas.busca(connection, function(dadosDisciplina) {
                    categorias.busca(connection, function(categorias) {
                        res.render('disciplinas/novo', {
                            data: {
                                user_data: req.session.data_user,
                                dadosDisciplina: dadosDisciplina,
                                categorias: categorias
                            }
                        });
                    });
                });
            } else {
                res.redirect('/');
            }
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/');
    }
});
// 7.1 Clique com o botão para adicionar conteúdo (na página do formulário)
app.post('/addConteudo', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == "administrador") {
            let disciplina = req.query.disciplina;
            if (disciplina) {
                var conteudos = new ConteudosDAO();
                var formData = new formidable.IncomingForm();
                formData.parse(req, function(error, fields, files) {
                    let extensao = files.file.name.substr(files.file.name.lastIndexOf("."))
                    let titulo = fields.titulo;
                    let categoria = fields.categoria;
                    let descricao = fields.resumo;
                    let data_upload = new Date();
                    let caminho_arquivo = md5(data_upload.getMinutes() + data_upload.getSeconds + data_upload.getMilliseconds()) + extensao
                    data_upload = data_upload.getDate() + "/" + (data_upload.getMonth() + 1) + "/" + data_upload.getFullYear();
                    if (!extensao || !titulo || !categoria || !descricao) {
                        res.send('Preencha todos os campos');
                    } else if (extensao != ".png" && extensao != ".jpg" && extensao != ".jpeg" && extensao != ".txt" && extensao != ".doc" && extensao != ".pdf" && extensao != ".ppt" && extensao != ".docx" && extensao != ".pptx") {
                        res.send('Extensão não suportada.');
                    } else {
                        if (extensao == ".txt") {
                            extensao = 1;
                        } else if (extensao == ".doc") {
                            extensaoID = 2;
                        } else if (extensao == ".pdf") {
                            extensaoID = 3;
                        } else if (extensao == ".ppt") {
                            extensaoID = 4;
                        } else if (extensao == ".jpeg") {
                            extensaoID = 5;
                        } else if (extensao == ".jpg") {
                            extensaoID = 6;
                        } else if (extensao == ".png") {
                            extensaoID = 7;
                        } else if (extensao == ".docx") {
                            extensaoID = 8;
                        } else if (extensao == ".pptx") {
                            extensaoID = 9;
                        }
                        conteudos.setTitulo(titulo);
                        conteudos.setCriador(req.session.data_user['id']);
                        conteudos.setDisciplina(disciplina);
                        conteudos.setCategoria(categoria);
                        conteudos.setData_upload(data_upload);
                        conteudos.setDescricao(descricao);
                        conteudos.setCaminho_arquivo(caminho_arquivo);
                        conteudos.setExtensaoID(extensaoID);

                        conteudos.cadastrarConteudo(connection, function(resultado) {
                            if (resultado == true) {
                                var oldpath = files.file.path;
                                var newpath = 'public/uploads/conteudos/' + caminho_arquivo;
                                var mv = require('mv');
                                if (oldpath && newpath) {
                                    mv(oldpath, newpath, function(err) {
                                        if (err) throw err;
                                        res.redirect("viewDisciplina?id=" + disciplina)
                                    });
                                }
                            } else {
                                res.redirect('/');
                            }
                        })

                    }
                })
            } else {
                res.redirect('/');
            }
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/');
    }
});
//8 Deletar um conteúdo juntamente com o arquivo
app.get("/excluirConteudo", function(req, res) {
    if (req.session.type == "administrador") {
        let idConteudo = req.query.id;
        let idDisciplina = req.query.idDisciplina;
        var conteudos = new ConteudosDAO();
        if (idConteudo && idDisciplina) {
            conteudos.setId(idConteudo)
            conteudos.buscaId(connection, function(buscado) {
                if (buscado[0]) {
                    conteudos.excluirConteudo(connection, function(resultado) {
                        fs.unlink('public/uploads/conteudos/' + buscado[0]['caminho_arquivo'], function(erro) {
                            if (erro) {
                                res.render('erro')
                            } else {
                                res.redirect('/viewDisciplina?id=' + idDisciplina)
                            }

                        })
                    })
                } else {
                    res.render("erro")
                }
            });

        } else {
            res.render('erro')
        }
    } else {
        res.render('erro')
    }
});
//9 Gerenciador de Categorias inseridas pelo usuário
app.get('/minhasCategorias', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == 'administrador') {
            var categorias = new CategoriasDAO();
            var disciplinas = new DisciplinasDAO();
            let id = req.session.data_user['id'];
            if (id) {
                categorias.setCriador(id);
                categorias.buscaCriador(connection, function(categorias) {
                    disciplinas.buscaGeral(connection, function(dadosDisciplina) {
                        res.render('disciplinas/gerenciadorCategorias', {
                            data: {
                                categorias: categorias,
                                disciplinas: dadosDisciplina,
                                erro: req.query.erro,
                                sucesso: req.query.sucesso,
                                user_data: req.session.data_user,
                                user_perfil: req.session.data_user
                            }
                        });
                    });
                });
            } else {
                res.render('erro')
            }
        } else {
            res.render('erro')
        }
    } else {
        res.redirect('/')
    }
});
//9.1 Adicionar categoria no sistema 
app.post('/adicionarCategoria', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == 'administrador') {
            let titulo = req.body.titulo;
            let disciplina = req.body.disciplina;
            let criador = req.session.data_user['id'];
            var categorias = new CategoriasDAO();
            if (titulo && disciplina) {
                categorias.setCriador(criador);
                categorias.setDisciplina(disciplina);
                categorias.setTitulo(titulo);
                categorias.inserirCategoria(connection, (resultado) => {
                    if (resultado == true) {
                        res.redirect('/minhasCategorias')
                    } else {
                        res.render('erro')
                    }
                })
            } else {
                res.render('erro')
            }
        } else {
            res.render('erro')
        }
    } else {
        res.redirect('/')
    }
});
//9.2 Deletar uma categoria do sistema 
app.get('/deletarCategoria', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == 'administrador') {
            connection.query('select * from categorias where id = ?', [req.query.id], (erro, resultado) => {
                if (erro) {
                    res.send("Erro no servidor")
                } else {
                    if (resultado['criador'] = req.session.data_user['id']) {
                        connection.query('select * from conteudos where categoria =?', [req.query.id], (erro, resultado) => {
                            if (erro) {
                                res.send("Erro no servidor");
                            } else if (resultado[0]) {
                                let id = req.session.data_user['id'];
                                if (id) {
                                    connection.query("select categorias.titulo as 'categoria', categorias.id as 'categoriaId', disciplinas.titulo as 'disciplina' from disciplinas inner join categorias on categorias.disciplina = disciplinas.id where categorias.criador = ?", [id], (erro, resultado) => {
                                        if (erro) {
                                            res.send('Erro no servidor!')
                                        } else {
                                            connection.query('select * from disciplinas', (erro, disciplinas) => {
                                                if (erro) {
                                                    res.send('erro no servidor!')
                                                } else {
                                                    res.render('disciplinas/gerenciadorCategorias', {
                                                        data: {
                                                            categorias: resultado,
                                                            disciplinas: disciplinas,
                                                            erro: "Há conteúdos inseridos nessa categoria. Ela não pode ser deletada.",
                                                            sucesso: req.query.sucesso,
                                                            user_data: req.session.data_user,
                                                            user_perfil: req.session.data_user
                                                        }
                                                    });
                                                }
                                            })
                                        }
                                    })
                                } else {
                                    res.redirect('/')
                                }
                            } else {
                                connection.query('delete from categorias where id = ?', [req.query.id], (erro) => {
                                    res.redirect('/minhasCategorias')
                                })
                            }
                        })
                    } else {
                        res.redirect('/')
                    }
                }
            })
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/');
    }
});
//<><><><><><><><><><><><>PERFIS E EDIÇÕES<><><><><><><><><><><><>///
// 9. Rota da página de perfil (Exibe informações de qualquer usuário) --------------- OK MVC
app.get('/userProfile', function(req, res) {
    if (req.session.logged == true) {
        let usuarios = new UsuariosDAO();
        let conteudos = new ConteudosDAO();
        let id = req.query.id;
        usuarios.setID(id);
        conteudos.setCriador(id);
        if (id) {
            usuarios.busca(connection, function(dados_perfil) {
                if (dados_perfil == "user_inexistente") {
                    res.render("erro")
                } else {
                    conteudos.buscaPorUser(connection, function(numero_de_conteudos) {
                        dados_perfil[0]['numero_de_conteudos'] = numero_de_conteudos;
                        res.render('perfil/perfil', {
                            data: {
                                erro: req.query.erro,
                                sucesso: req.query.sucesso,
                                user_data: req.session.data_user,
                                user_perfil: dados_perfil[0]
                            }
                        });

                    });
                }
            });
        } else {
            res.redirect('home');
        }
    } else {
        res.redirect('home');
    }
});
//Atualizar foto de perfil --------------------------------- OK MVC
app.post("/mudarFotoUsuario", uploadFotoPerfil.single("fotoPerfil"), function(req, res) {
    let usuarios = new UsuariosDAO();
    if (((req.file['filename'].split('.'))[1]) == 'png' || ((req.file['filename'].split('.'))[1]) == 'jpg' || ((req.file['filename'].split('.'))[1]) == 'PNG' || ((req.file['filename'].split('.'))[1]) == 'JPG') {
        let diretorio = "uploads/fotos/"
        let caminho_foto = diretorio + md5(req.session.data_user['email']) + "." + ((req.file['filename'].split('.'))[1]);
        usuarios.setFoto(caminho_foto);
        usuarios.setID(req.session.data_user['id'])
        usuarios.atualizarFoto(connection, function(resultado) {
            if (resultado == true) {
                req.session.data_user['caminho_foto'] = caminho_foto;
                res.redirect('/userProfile?id=' + req.session.data_user['id'])
            } else {
                res.send("Erro")
            }
        });
    } else {
        fs.unlink("public/uploads/fotos/" + md5(req.session.data_user['email']) + "." + req.file['filename'].split('.')[1])
        res.send("Formato não suportado")
    }
});
//Atualizar dados do usuário ------------------------------ OK MVC
app.post("/mudarDados", function(req, res) {
    let usuarios = new UsuariosDAO();
    if (req.session.logged == true) {
        let id = req.session.data_user['id'];
        let senha = req.body.senha;
        let senhaConfirma = req.body.senhaConfirma;
        let biografia = req.body.descricao;
        let apelido = req.body.apelido;

        if (apelido) {
            if ((apelido.split(' ')).length > 1) {
                res.redirect('/userProfile?id=' + id + '&erro=true')
            } else {
                if (biografia) {
                    if (senha && senhaConfirma) {
                        if (senha.length >= 8) {
                            if (senha == senhaConfirma) {
                                senha = md5(senha)
                                usuarios.setID(id)
                                usuarios.setSenha(senha)
                                usuarios.setBiografia(biografia)
                                usuarios.setApelido(apelido)
                                usuarios.atualizarDados(connection, function(resultado) {
                                    if (resultado == true) {
                                        req.session.data_user['biografia'] = biografia
                                        req.session.data_user['senha'] = senha
                                        req.session.data_user['apelido'] = apelido
                                        res.redirect('/userProfile?id=' + id + '&sucesso=true')
                                    } else {
                                        res.send("Erro")
                                    }
                                });
                            }
                        }
                    } else {
                        usuarios.setID(id)
                        usuarios.setBiografia(biografia)
                        usuarios.setApelido(apelido)
                        usuarios.atualizarDados(connection, function(resultado) {
                            if (resultado == true) {
                                req.session.data_user['biografia'] = biografia
                                req.session.data_user['apelido'] = apelido
                                res.redirect('/userProfile?id=' + id + '&sucesso=true')
                            } else {
                                res.send("Erro")
                            }
                        });
                    }
                } else {
                    res.redirect('/userProfile?id=' + id + '&erro=true')
                }
            }



        } else {


            res.redirect('/userProfile?id=' + id + '&erro=true')

        }
    } else {
        res.redirect('home')
    }
});

//BIBLIOTECA ONLINE
//10.1 Visualizar
app.get('/biblioteca', function(req, res) {
    if (req.session.logged == true) {
        let livros = new LivrosDAO();
        let busca = req.query.busca;
        if (busca) {
            livros.setTextoBusca(busca);
            livros.buscaPorTexto(connection, function(livros) {
                if (livros[0]) {
                    res.render('biblioteca/leituras', {
                        data: {
                            livros: livros,
                            user_data: req.session.data_user
                        }
                    });
                } else {
                    res.send("Nenhum livro");
                }
            })
        } else {
            connection.query("select livros.id, livros.titulo, livros.autor, livros.ano, livros.caminho_capa, livros.caminho_arquivo, usuarios.apelido as 'apelido', usuarios.id as 'idUser' from livros inner join usuarios on livros.criador = usuarios.id", (erro, resultado) => {
                if (erro) {
                    res.send(erro);
                } else {
                    res.render('biblioteca/leituras', {
                        data: {
                            livros: resultado,
                            user_data: req.session.data_user
                        }
                    });
                }
            })
        }


    } else {
        res.redirect('home');
    }
});
//10.2 Adicionar livro
app.get('/addLivro', function(req, res) {
    if (req.session.logged == true) {
        let erroCode = req.query.erroCode;
        if (erroCode == 1) {
            erroCode = "Preencha todos os campos"
        } else if (erroCode == 2) {
            erroCode = "Livro precisa ser em PDF"
        } else if (erroCode == 3) {
            erroCode = "Capa precisa ser em JPG ou PNG"
        }
        if (req.session.type == "administrador") {
            res.render('biblioteca/addLivro', {
                data: {
                    erro: erroCode,
                    user_data: req.session.data_user
                }
            });

        } else {
            res.redirect('/home');
        }
    } else {
        res.redirect('/home');
    }
});
app.post('/addLivro', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == "administrador") {
            let id = req.session.data_user['id'];
            if (id) {
                var formData = new formidable.IncomingForm();
                formData.parse(req, function(error, fields, files) {
                    let extensaoLivro = files.livro.name.substr(files.livro.name.lastIndexOf("."))
                    let extensaoCapa = files.capa.name.substr(files.capa.name.lastIndexOf("."))
                    let titulo = fields.titulo;
                    let autor = fields.autor;
                    let ano = fields.ano;
                    let creation = new Date()
                    let time = md5(creation.getMinutes() + creation.getSeconds + creation.getMilliseconds())
                    let nome_livro = "leitura_" + time + extensaoLivro
                    let caminho_capa = "capa_" + time + extensaoCapa
                    creation = creation.getDate() + "/" + (creation.getMonth() + 1) + "/" + creation.getFullYear();
                    if (!titulo || !autor || !ano || !extensaoLivro || !extensaoCapa) {
                        res.redirect('/addLivro?erroCode=1');
                    } else if (extensaoLivro != ".pdf") {
                        res.redirect('/addLivro?erroCode=2');
                    } else if (extensaoCapa != ".png" && extensaoCapa != ".jpeg" && extensaoCapa != ".jpg" && extensaoCapa != ".PNG" && extensaoCapa != ".JPG" && extensaoCapa != ".JPEG") {
                        res.redirect('/addLivro?erroCode=3');
                    } else {
                        connection.query("insert livros (titulo, autor, ano, caminho_capa, caminho_arquivo, criador) values (?,?,?,?,?,?)", [titulo, autor, ano, caminho_capa, nome_livro, id], function() {
                            var oldpathLivro = files.livro.path;
                            var oldpathCapa = files.capa.path;
                            var newpathLivro = 'public/uploads/livros/' + nome_livro;
                            var newpathCapa = 'public/uploads/livros/capas/' + caminho_capa;
                            var mv = require('mv');
                            if (oldpathLivro && newpathLivro && oldpathCapa && newpathCapa) {
                                mv(oldpathLivro, newpathLivro, function(err) {
                                    if (err) throw err;
                                    mv(oldpathCapa, newpathCapa, function(err) {
                                        if (err) throw err;
                                        res.redirect('/biblioteca');
                                    });
                                });
                            }

                        })
                    }
                })
            } else {
                res.redirect('/');
            }
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/home');
    }
});

//10.3 Deletar Livro
app.get("/deletarLivro", function(req, res) {
    if (req.session.type == "administrador") {
        let idLivro = req.query.id;
        let id = req.session.data_user['id'];
        if (idLivro) {
            connection.query("select * from livros where id = ?", [idLivro], (erro, resultado) => {
                if (erro) {
                    res.send(erro)
                } else {
                    if (resultado[0]['criador'] == id) {
                        fs.unlink('public/uploads/livros/' + resultado[0]['caminho_arquivo'], function(erro) {
                            if (erro) {
                                res.send(erro);
                            } else {
                                fs.unlink('public/uploads/livros/capas/' + resultado[0]['caminho_capa'], function(erro) {
                                    if (erro) {
                                        res.send(erro);
                                    } else {
                                        connection.query("delete from livros where id =?", [idLivro], (erro) => {
                                            res.redirect('/biblioteca')
                                        })
                                    }
                                });
                            }
                        });
                    } else {
                        res.send("Você está tentando deletar um livro que você não inseriu")
                    }
                }
            })
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/')
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});






