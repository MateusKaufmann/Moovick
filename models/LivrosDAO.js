module.exports = class LivrosDAO {
    constructor() {
        this.id = null;
        this.textoBusca = null;
        this.titulo = null;
        this.autor = null;
        this.ano = null;
        this.nome_livro = null;
        this.id_user = null;
    };
    setId(I) {
        this.id = I;
    };
    setTitulo(T) {
        this.titulo = T;
    };
    setAutor(A) {
        this.autor = A;
    };
    setAno(Y) {
        this.ano = Y;
    };
    setNome(nome_livro) {
        this.nome_livro = nome_livro;
    };
    setIdUser(id_user) {
        this.id_user = id_user;
    };
    setTextoBusca(textoBusca) {
        this.textoBusca = textoBusca;
    }

    list(connection, callback) {
        var sql = "select livros.id, livros.titulo, livros.autor, livros.ano, livros.caminho_arquivo, usuarios.apelido as 'apelido', usuarios.id as 'idUser' from livros inner join usuarios on livros.criador = usuarios.id";
        connection.query(sql, (erro, result) => {
            if (erro) throw erro;
            return callback(result)
        })
    }

    buscaPorId(connection, callback) {
        var sql = "select * from livros where id =?";
        connection.query(sql, [this.id], (erro, result) => {
            if (erro) throw erro;
            return callback(result);
        });
    }

    buscaPorTexto(connection, callback) {
        connection.query("select livros.id, livros.titulo, livros.autor, livros.ano, livros.caminho_arquivo, usuarios.apelido as 'apelido', usuarios.id as 'idUser' from livros inner join usuarios on livros.criador = usuarios.id WHERE livros.titulo like '%" + this.textoBusca + "%'", (erro, livros) => {
            if (erro) throw erro;
            return callback(livros);
        })
    }

    create(connection, callback) {
        var sql = "insert livros (titulo, autor, ano, caminho_arquivo, criador) values (?,?,?,?,?)";
        connection.query(sql, [this.titulo, this.autor, this.ano, this.nome_livro, this.id_user], function(erro, result) {
            if (erro) throw erro;
            return callback(true);
        })
    };

    delete(connection, callback) {
        var sql = "delete from livros where id =?";
        connection.query(sql, [this.id], (erro) => {
            if (erro) throw erro;
            return callback(true);
        })
    }

    update(connection, callback) {
        var sql = "UPDATE LIVROS SET titulo = ?, autor = ?, ano = ? where id = ?";

        connection.query(sql, [this.titulo, this.autor, this.ano, this.id], function(err, result) {
            if (err) throw err;
            return callback(true);

        });
    }
}