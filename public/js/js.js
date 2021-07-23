$(document).ready(function() {
    $(".link-card").click(function(event) {
        event.preventDefault();
        var link = $(this).attr("href");
        $(this).addClass("animated animate__zoomOut faster");
        $(".logo-animado").addClass("animate__fadeOutLeft fast");
        $(".deck-animado").addClass("animate__slideOutDown fast");
        $(".navbar-animada").addClass("animate__slideOutUp fast");
        $(".deck-animado").removeClass("animate__slideInUp slow");
        $(".logo-animado").removeClass("animate__fadeInLeft");
        $(".navbar-animada").removeClass("animate__fadeInDown faster");
        setTimeout(function() {
            window.location.href = link;
        }, 1300);
    });
    $("#btn-mudar-dados").click(function(event) {
        $(".logo-animado1").addClass("animate__fadeOutLeft fast");
        $(".deck-animado1").addClass("animate__slideOutDown faster");
        setTimeout(function() {
            $(".deck-animado1").css("display", "none");
            $(".deck-animado2").css("display", "");
        }, 500);

    });
    $(".excluir-conteudo-link").click(function(event) {
        event.preventDefault();
        var link = $(this).attr("href");
        var r = confirm("Você está prestes a excluir permanentemente o conteúdo selecionado. Essa ação não poderá ser desfeita. Você tem certeza?");
        if (r == true) {
            $(this).addClass("animated animate__zoomOut faster");
            window.location.href = link;
        }


    });
});

function clickInicio() {
    $(".logo").addClass("animate__fadeOutLeft fast");
    $(".logo").removeClass("animate__fadeInLeft");
}

function cadastro() {
    $(".zoomIn").addClass("zoomOut fast");
    $(".zoomIn").removeClass("zoomIn");
    $(".vanishIn").addClass("fadeOutUp");
    $(".vanishIn").removeClass("vanishIn");
    setTimeout(function() {
        window.location.href = "/cadastro";
    }, 1000);

}

//Validação do formulário de Cadastro

function cadastrarUsuario() {
    let nome_completo = document.getElementById("nome_completo").value;
    let apelido = document.getElementById("apelido").value;
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;
    let senhaConfirma = document.getElementById("senhaConfirma").value;
    let descricao = document.getElementById("descricao").value;
    let erroCampo = document.getElementById("erro");
    let erroCampoServer = document.getElementById("erroServer");
    let data_nascimento = document.getElementById("data_nascimento").value;
    erroCampo.setAttribute('style', 'display:none');
    if (erroCampoServer) {
        erroCampoServer.setAttribute('style', 'display:none');
    }
    if (!nome_completo || !apelido || !email || !senha || !senhaConfirma || !data_nascimento) {
        erroCampo.innerText = "Lembre-se de preencher todos os campos!"
        erroCampo.removeAttribute('style');
    } else if (senha != senhaConfirma) {
        erroCampo.innerText = "As senhas divergem entre si."
        erroCampo.removeAttribute('style');
    } else if ((nome_completo.split(' ')).length < 2) {
        erroCampo.innerText = "Você não inseriu um nome completo."
        erroCampo.removeAttribute('style');
    } else if (senha.length < 8) {
        erroCampo.innerText = "Sua senha não atende às exigências mínimas."
        erroCampo.removeAttribute('style');
    } else {
        document.formularioCadastro.submit();
    }
}

//Cadastrar conteúdo

function cadastrarConteudo() {
    let titulo = document.getElementById("titulo").value;
    let categoria = document.getElementById("categoria").value;
    let resumo = document.getElementById("resumo").value;
    let file = document.getElementById("file").files.length;
    let erroCampo = document.getElementById("erro");
    erroCampo.setAttribute('style', 'display:none');
    if (!titulo || !categoria || !resumo || (file < 1)) {
        erroCampo.innerText = "Preencha todos os campos"
        erroCampo.removeAttribute('style');
    } else {
        document.formularioConteudo.submit();
    }
}

//Cadastrar categoria 

function cadastrarCategoria() {
    let titulo = document.getElementById('titulo').value;
    let disciplina = document.getElementById('disciplina').value;
    let erroCampo = document.getElementById("erro");
    erroCampo.setAttribute('style', 'display:none');
    if (!titulo || !disciplina) {
        erroCampo.innerText = "Preencha todos os campos"
        erroCampo.removeAttribute('style');
    } else {
        document.formularioCategoria.submit();
    }
}