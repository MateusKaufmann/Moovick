function addConteudo() {
    let disciplina = document.getElementById("disciplina").value;
    let titulo = document.getElementById("titulo").value;
    let categoria = document.getElementById("categoria").value;
    let descricao = document.getElementById("descricao").value;

    if (!disciplina || !titulo || !categoria || !descricao) {
        alert("Lembre-se: todos os campos devem estar preenchidos. Por favor, verifique se incluiu todos os dados :)")
    } else {
        $(".animate__fadeInRightBig").addClass("animate__fadeOutLeftBig");
        $(".animate__fadeInRightBig").removeClass("animate__fadeInRightBig");
        setTimeout(function() {
            document.formulario.submit();
        }, 800);
    }

}