function filtrar() {
    let tipo = document.getElementById("tipo").value;
    let categoria = document.getElementById("categoria").value;
    let user = document.getElementById("user").value;
    let url_atual = window.location.href;
    window.location.href = url_atual.split("&")[0] + "&tipo=" + tipo + "&categoria=" + categoria + "&user=" + user;
}

function buscar() {
    let texto_busca = document.getElementById("campo_busca").value;
    let url_atual = window.location.href;
    window.location.href = url_atual.split("&")[0] + "&busca=" + texto_busca;
}

//Buscar Livro

function buscarLivro() {
    let busca = document.getElementById("campo_busca_livro").value;
    let url_atual = window.location.href;
    window.location.href = url_atual.split("?")[0] + "?busca=" + busca;

}