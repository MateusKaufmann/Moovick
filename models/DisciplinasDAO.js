module.exports = class DisciplinasDAO {
    constructor() {
        //Usado na consulta
        this.id = null;
    }
    setID(id) {
        this.id = id;
    }
    getID() {
        return this.id;
    };
    //busca por id
    busca(connection, callback) {
        connection.query("select * from disciplinas where id=?", [this.id], (erro, dadosDisciplina) => {
            if (erro) throw erro;
            return callback(dadosDisciplina);
        })
    };
    //busca geral
    buscaGeral(connection, callback) {
        connection.query("select * from disciplinas", (erro, dadosDisciplina) => {
            if (erro) throw erro;
            return callback(dadosDisciplina);
        })
    }
}