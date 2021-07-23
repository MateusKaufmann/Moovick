module.exports = class ExtensoesDAO {
    constructor() {
        //Usado na consulta
        this.id = null;
    }
    setID(id) {
        this.id = id;
    }
    busca(connection, callback) {
        connection.query("select * from extensoes", (erro, extensoes) => {
            if (erro) throw erro;
            return callback(extensoes);
        })
    }
}