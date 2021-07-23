module.exports = class ConteudosDAO {
    constructor() {
        //Usado na consulta
        this.reference = null;
        //Usado na consulta de quantos conteúdos um usuário publicou
        this.criador = null;
        //Usado na busca na tela de disciplina
        this.textoBusca = null;
        this.disciplina = null;
        this.categoria = null;
        this.extensaoID = null;
        //usado na inserção
        this.titulo = null;
        this.data_upload = null;
        this.descricao = null;
        this.caminho_arquivo = null;
        //Usado na exclusão
        this.id = null;

    }
    setCriador(criador) {
        this.criador = criador;
    }
    setTextoBusca(textoBusca) {
        this.textoBusca = textoBusca;
    }
    setDisciplina(disciplina) {
        this.disciplina = disciplina;
    };
    setCategoria(categoria) {
        this.categoria = categoria;
    };
    setExtensaoID(extensaoID) {
        this.extensaoID = extensaoID;
    };
    setTitulo(titulo) {
        this.titulo = titulo;
    };
    setData_upload(data_upload) {
        this.data_upload = data_upload;
    };
    setDescricao(descricao) {
        this.descricao = descricao;
    };
    setCaminho_arquivo(caminho_arquivo) {
        this.caminho_arquivo = caminho_arquivo;
    };
    setId(id) {
        this.id = id;
    };
    //Busca por id
    buscaId(connection, callback) {
        connection.query("select * from conteudos where id =?", [this.id], (erro, resultado) => {
            if (erro) throw erro;
            return callback(resultado);
        })
    };
    //Busca geral
    buscaGeral(connection, callback) {
        connection.query("select conteudos.descricao as 'resumoConteudo', conteudos.id as 'idConteudo', conteudos.caminho_arquivo as 'caminho_arquivo', conteudos.titulo as 'titulo', categorias.titulo as 'categoria', categorias.id as 'categoriaID', extensoes.extensao as 'extensao', extensoes.id as 'extensaoID', conteudos.data_upload as 'postagem', usuarios.apelido as 'criadorApelido', usuarios.id as 'criadorId' from conteudos inner join disciplinas on disciplinas.id = conteudos.disciplina inner join usuarios on usuarios.id = conteudos.criador inner join categorias on categorias.id = conteudos.categoria inner join extensoes on extensoes.id = conteudos.`extensao` where conteudos.disciplina=?", [this.disciplina], (erro, resultado) => {
            if (erro) throw erro;
            return callback(resultado);
        })
    };
    //Buscar um conteúdo por palavra-chave
    buscaPorPalavraChave(connection, callback) {
        connection.query("select conteudos.descricao as 'resumoConteudo', conteudos.id as 'idConteudo', conteudos.caminho_arquivo as 'caminho_arquivo', conteudos.titulo as 'titulo', categorias.titulo as 'categoria', extensoes.extensao as 'extensao', conteudos.data_upload as 'postagem', usuarios.apelido as 'criadorApelido', usuarios.id as 'criadorId' from conteudos inner join disciplinas on disciplinas.id = conteudos.disciplina inner join usuarios on usuarios.id = conteudos.criador inner join categorias on categorias.id = conteudos.categoria inner join extensoes on extensoes.id = conteudos.`extensao` where conteudos.titulo like ? and conteudos.disciplina=?", [this.textoBusca, this.disciplina], (erro, resultado) => {
            if (erro) throw erro;
            return callback(resultado);
        })
    };
    //Buscar quantos conteúdos pertencem a um usuário
    buscaPorUser(connection, callback) {
        connection.query("select COUNT(id) from conteudos where criador=?", [this.criador], (erro, numero_de_conteudos) => {
            if (erro) throw erro;
            return callback(numero_de_conteudos[0]['COUNT(id)']);
        })
    };
    //Cadastrar um conteúdo no banco de dados
    cadastrarConteudo(connection, callback) {
        connection.query("insert conteudos (titulo, criador, disciplina, categoria, data_upload, descricao, caminho_arquivo, extensao) values (?,?,?,?,?,?,?,?)", [this.titulo, this.criador, this.disciplina, this.categoria, this.data_upload, this.descricao, this.caminho_arquivo, this.extensaoID], (erro, resultado) => {
            if (erro) throw erro;
            return callback(true);
        })
    };
    //Excluir um conteúdo
    excluirConteudo(connection, callback) {
        connection.query("delete from conteudos where id =?", [this.id], (erro) => {
            if (erro) throw erro;
            return callback(true);
        })
    };
}