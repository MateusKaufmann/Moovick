//<><><><><><><><><><><><>MÓDULOS<><><><><><><><><><><><>//

const express = require('express');
const mysql = require('mysql');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
// Nodemailer removido
const multer = require('multer');
const md5 = require('md5');
const formidable = require('formidable');
const busboy = require('connect-busboy');
const fs = require('fs-extra');
const { connect } = require('http2');
const { unlink } = require('fs');

//<><><><><><><><><><><><>CONFIGURAÇÕES DE MÓDULOS<><><><><><><><><><><><>//

app.listen(3000, function() {
    console.log("Servidor no ar rodando na porta 3000.")
});

app.use(session({
    secret: 'lisamilapo',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000000 }
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

const storageFotoPerfil = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/fotos')
    },
    filename: function(req, file, cb) {
        cb(null, `${md5(req.session.data_user['email'])}${path.extname(file.originalname)}`);
    }
});
const uploadFotoPerfil = multer({ storage: storageFotoPerfil });

//<><><><><><><><><><><><>CONEXÃO COM O BANCO DE DADOS<><><><><><><><><><><><>//
var connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'moovick'
});

//<><><><><><><><><><><><>IMPORTAR MODELS<><><><><><><><><><><><>//

const UsuariosDAO = require('./models/UsuariosDAO');
const ConteudosDAO = require('./models/ConteudosDAO');
const DisciplinasDAO = require('./models/DisciplinasDAO');
const CategoriasDAO = require('./models/CategoriasDAO');
const ExtensoesDAO = require('./models/ExtensoesDAO');
const LivrosDAO = require('./models/LivrosDAO');

//<><><><><><><><><><><><>PÁGINAS INICIAIS<><><><><><><><><><><><>//

app.get('/', function(req, res) {
    if (req.session.logged == true) {
        res.render('homes/logado/index', {
            data: { user_data: req.session.data_user }
        });
    } else {
        res.redirect('home');
    }
});

app.get('/home', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('homes/n_logado/home');
    }
});

app.get('/login', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('credenciais/login', { data: { stts: null } });
    }
});

app.post('/auth', function(req, res) {
    let usuarios = new UsuariosDAO();
    let caminho_foto = 'assets/icons/padraoProfile.png';
    if (req.body.email && req.body.password) {
        usuarios.setEmail(req.body.email);
        usuarios.setSenha(md5(req.body.password));
        usuarios.login(connection, function(resultado) {
            if (resultado == "user_inexistente") {
                res.render('credenciais/login', { data: { stts: "Usuário não encontrado." } });
            } else if (resultado == "senha_incorreta") {
                res.render('credenciais/login', { data: { stts: "Senha incorreta." } });
            } else {
                if (!resultado[0]['caminho_foto']) {
                    resultado[0]['caminho_foto'] = caminho_foto;
                }
                req.session.data_user = resultado[0];
                req.session.type = (resultado[0]['administrador'] == 1) ? 'administrador' : 'aluno';
                req.session.logged = true; // Login direto sem verificar
                res.redirect('/');
            }
        });
    } else {
        res.render('credenciais/login', { data: { stts: "Preencha todos os campos." } });
    }
});

app.get('/cadastro', function(req, res) {
    if (req.session.logged) {
        res.redirect('/');
    } else {
        res.render('credenciais/cadastro', { data: { erro: null } });
    }
});

app.post('/cadastrar', function(req, res) {
    let usuarios = new UsuariosDAO();
    let { nome_completo, apelido, email, senha, senhaConfirma, data_nascimento, descricao: biografia } = req.body;
    let data = new Date;
    let dataAtual = data.getFullYear() + "-" + (data.getMonth() + 1) + "-" + data.getDate();

    if (!nome_completo || !apelido || !email || !senha || !senhaConfirma || !data_nascimento || !biografia) {
        return res.render('credenciais/cadastro', { data: { erro: "Você não preencheu todos os campos." } });
    }

    if (senha != md5(senhaConfirma) && senha !== senhaConfirma) { // Ajuste simples de lógica de comparação
        if (md5(senha) != md5(senhaConfirma)) {
             return res.render('credenciais/cadastro', { data: { erro: "As senhas divergem entre si!" } });
        }
    }

    usuarios.setNome_Completo(nome_completo);
    usuarios.setApelido(apelido);
    usuarios.setEmail(email);
    usuarios.setSenha(md5(senha));
    usuarios.setSenha_Confirma(md5(senhaConfirma));
    usuarios.setBiografia(biografia);
    usuarios.setData_Nascimento(data_nascimento);
    usuarios.setData_Atual(dataAtual);

    usuarios.cadastro(connection, function(resultado) {
        if (resultado == "user_existente") {
            res.render('credenciais/cadastro', { data: { erro: "Já existe um usuário vinculado a esse email." } });
        } else if (resultado[0] && resultado[0]['email'] == email) {
            req.session.data_user = resultado[0];
            req.session.type = 'aluno';
            req.session.logged = true; // Loga o usuário imediatamente
            res.redirect('/');
        } else {
            res.render('credenciais/cadastro', { data: { erro: "Erro ao realizar cadastro." } });
        }
    });
});

app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
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
        res.render('erro');
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
                    res.render('erro');
                }
            });
        } else {
            res.render('erro');
        }
    } else {
        res.render('erro');
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
                res.render('erro');
            }
        } else {
            res.render('erro');

        }
    } else {
        res.render('erro');
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
                                        res.redirect("/viewDisciplina?id=" + disciplina)
                                    });
                                }
                            } else {
                                res.render('erro');
                            }
                        })

                    }
                })
            } else {
                res.render('erro');
            }
        } else {
            res.render('erro');
        }
    } else {
        res.render('erro');
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
        res.render('erro');
    }
});
//9.1 Adicionar categoria no sistema 
app.post('/adicionarCategoria', function(req, res) {
    if (req.session.logged == true) {
        if (req.session.type == 'administrador') {
            let titulo = req.body.titulo;
            let disciplina = req.body.disciplina;
            let criador = req.session.data_user['id'];
            let categorias = new CategoriasDAO();
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
        res.render('erro');
    }
});
//9.2 Deletar uma categoria do sistema 
app.get('/deletarCategoria', function(req, res) {
    if (req.session.logged == true) {
        var categorias = new CategoriasDAO();
        categorias.setID(req.query.id);
        if (req.session.type == 'administrador') {
            categorias.buscaId(connection, (erro, resultado) => {
                if (erro) throw erro;
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
                                res.render('erro');
                            }
                        } else {
                            connection.query('delete from categorias where id = ?', [req.query.id], (erro) => {
                                res.redirect('/minhasCategorias')
                            })
                        }
                    })
                } else {
                    res.render('erro');
                }

            })
        } else {
            res.render('erro');
        }
    } else {
        res.render('erro');
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
            res.render('erro');
        }
    } else {
        res.render('erro');
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
                res.render('erro');
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
                                        res.render('erro');
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
                                res.render('erro');
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
        res.render('erro');
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
            livros.list(connection, function(result) {
                if (result[0]) {
                    res.render('biblioteca/leituras', {
                        data: {
                            livros: result,
                            user_data: req.session.data_user
                        }
                    });
                } else {
                    res.render('biblioteca/leituras', {
                        data: {
                            livros: null,
                            user_data: req.session.data_user
                        }
                    });
                }
            })
        }


    } else {
        res.render('erro');
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
            res.render('erro');
        }
    } else {
        res.render('erro');
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
                    let titulo = fields.titulo;
                    let autor = fields.autor;
                    let ano = fields.ano;
                    let creation = new Date()
                    let time = md5(creation.getMinutes() + creation.getSeconds + creation.getMilliseconds())
                    let nome_livro = "leitura_" + time + extensaoLivro
                    creation = creation.getDate() + "/" + (creation.getMonth() + 1) + "/" + creation.getFullYear();
                    if (!titulo || !autor || !ano || !extensaoLivro) {
                        res.redirect('/addLivro?erroCode=1');
                    } else if (extensaoLivro != ".pdf") {
                        res.redirect('/addLivro?erroCode=2');
                    } else {
                        let livros = new LivrosDAO();
                        livros.setTitulo(titulo);
                        livros.setAutor(autor);
                        livros.setAno(ano);
                        livros.setNome(nome_livro);
                        livros.setIdUser(id);
                        livros.create(connection, function(result) {
                            var oldpathLivro = files.livro.path;
                            var newpathLivro = 'public/uploads/livros/' + nome_livro;
                            var mv = require('mv');
                            if (oldpathLivro && newpathLivro) {
                                mv(oldpathLivro, newpathLivro, function(err) {
                                    if (err) throw err;
                                    res.redirect('/biblioteca');
                                });
                            }

                        })
                    }
                })
            } else {
                res.render('erro');
            }
        } else {
            res.render('erro');
        }
    } else {
        res.render('erro');
    }
});

//10.3 Deletar Livro
app.get("/deletarLivro", function(req, res) {
    if (req.session.type == "administrador") {
        let idLivro = req.query.id;
        let id = req.session.data_user['id'];
        let livros = new LivrosDAO();
        if (idLivro) {
            livros.setId(idLivro)
            livros.buscaPorId(connection, (result) => {
                if (result[0] && (result[0]['criador'] == id)) {
                    fs.unlink('public/uploads/livros/' + result[0]['caminho_arquivo'], function(erro) {
                        if (erro) {
                            res.send(erro);
                        } else {
                            livros.delete(connection, function(result) {
                                if (result) {
                                    res.redirect("/biblioteca");
                                } else {
                                    res.render('erro');
                                }
                            })

                        }
                    });
                } else {
                    res.render('erro')
                }

            })
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/')
    }
});

app.get('/atualizarLivros', function(req, res) {
    if (req.session.logged == true) {
        var livros = new LivrosDAO();
        livros.setId(req.query.id);

        livros.buscaPorId(connection, function(result) {
            res.render('biblioteca/atualizar.ejs', { livros: result, data: { user_data: req.session.data_user } });

        });
    } else {
        res.render('erro')
    }

});

app.post('/salvarLivros', function(req, res) {
    if (req.session.logged == true) {
        var livros = new LivrosDAO();
        livros.setId(req.body.id);
        livros.setTitulo(req.body.titulo);
        livros.setAutor(req.body.autor);
        livros.setAno(req.body.ano);
        livros.update(connection, function(erro, result) {
            res.redirect("/biblioteca");
        });

    } else {
        res.render('erro')
    }
});

