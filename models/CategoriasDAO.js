module.exports = class CategoriasDAO {
    constructor() {
        //Usado na consulta
        this.id = null;
        this.disciplina = null;
    };
    setID(id) {
        this.id = id;
    };
    setDisciplina(disciplina) {
        this.disciplina = disciplina;
    };
    setCriador(criador) {
        this.criador = criador;
    };
    setTitulo(titulo) {
        this.titulo = titulo;
    };
    //Busca de categorias por disciplina
    busca(connection, callback) {
        connection.query("select * from categorias where disciplina=?", [this.disciplina], (erro, categorias) => {
            if (erro) throw erro;
            return callback(categorias);
        })
    };
    //Busca de categorias por disciplina
    buscaCriador(connection, callback) {
        connection.query("select categorias.titulo as 'categoria', categorias.id as 'categoriaId', disciplinas.titulo as 'disciplina' from disciplinas inner join categorias on categorias.disciplina = disciplinas.id where categorias.criador = ?", [this.criador], (erro, categorias) => {
            if (erro) throw erro;
            return callback(categorias);
        })
    };
    //Inserção de categoria
    inserirCategoria(connection, callback) {
        connection.query("insert categorias (disciplina, titulo, criador) values (?, ?, ?)", [this.disciplina, this.titulo, this.criador], (erro) => {
            if (erro) throw erro;
            return callback(true);
        })
    };
}