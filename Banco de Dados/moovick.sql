
drop database moovick;
create database if not exists moovick;
use moovick;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL,
  `email` varchar(45) NOT NULL,
  `senha` varchar(45) NOT NULL,
  `apelido` varchar(25) NOT NULL,
  `nome_completo` varchar(100) NOT NULL,
  `data_nascimento` date DEFAULT NULL,
  `data_ingresso` date NOT NULL,
  `caminho_foto` varchar(100) DEFAULT NULL,
  `administrador` tinyint(1) DEFAULT NULL,
  `biografia` longtext,
  `cod_verificador` varchar(10) NOT NULL,
  `verificado` tinyint(1) NOT NULL
);

INSERT INTO `usuarios` (`id`, `email`, `senha`, `apelido`, `nome_completo`, `data_nascimento`, `data_ingresso`, `caminho_foto`, `administrador`, `biografia`, `cod_verificador`, `verificado`) VALUES
(2, 'mbkdsilva@restinga.ifrs.edu.br', '82097c0458823b7f8f70970a9314ccd9', 'Mateuszinho', 'Mateus Batista Kaufmann da Silva', '2002-05-08', '0000-00-00', 'uploads/caminho_fotos/803115c88521a3f5930e57b48852afae.jpg', 1, '18 Anos. Estudante do 4º Ano do Ensino Médio integrado ao curso Técnico em Informática do IFRS Campus Restinga. Desenvolvedor do Moovick', '107660-3', 1),
(6, 'luis.henrique.leiria.pinheiro@gmail.com', '47faa10e78b1aa8adf1fcea2b6135283', 'lhlpinheiro', 'Luís Henrique Leiria Pinheiro', '2001-01-20', '0000-00-00', 'uploads/caminho_fotos/fb8462b15907148276d651084e8c8862.jpg', 0, 'Estudante da UFRGS.', '425202-3', 1);

CREATE TABLE IF NOT EXISTS `categorias` (
  `id` int(11) NOT NULL,
  `disciplina` int(11) NOT NULL,
  `titulo` varchar(45) NOT NULL,
  `criador` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `conteudos` (
  `id` int(11) NOT NULL,
  `titulo` varchar(45) NOT NULL,
  `criador` int(11) NOT NULL,
  `disciplina` int(11) NOT NULL,
  `categoria` int(11) NOT NULL,
  `data_upload` varchar(25) NOT NULL,
  `descricao` varchar(100) DEFAULT NULL,
  `caminho_arquivo` varchar(100) NOT NULL,
  `extensao` int NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `disciplinas` (
  `id` int(11) NOT NULL,
  `titulo` varchar(45) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=latin1;

INSERT INTO `disciplinas` (`id`, `titulo`) VALUES
(1, 'Literatura'),
(2, 'Linguagens'),
(3, 'Matemática'),
(4, 'Física'),
(5, 'Química'),
(6, 'Biologia'),
(7, 'Geografia'),
(8, 'História'),
(9, 'Filosofia'),
(10, 'Sociologia'),
(11, 'Artes'),
(12, 'Educação Física'),
(13, 'Redação'),
(14, 'Tecnologias');

CREATE TABLE IF NOT EXISTS `extensoes` (
  `id` int(11) NOT NULL,
  `extensao` varchar(45) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;

INSERT INTO `extensoes` (`id`, `extensao`) VALUES
(1, 'txt'),
(2, 'doc'),
(3, 'pdf'),
(4, 'ppt'),
(5, 'jpeg'),
(6, 'jpg'),
(7, 'png'),
(8, 'docx');

CREATE TABLE IF NOT EXISTS `livros` (
  `id` int(11) NOT NULL,
  `titulo` varchar(45) NOT NULL,
  `autor` varchar(45) NOT NULL,
  `ano` int(11) NOT NULL,
  `caminho_capa` varchar(1000) NOT NULL,
  `caminho_arquivo` varchar(1000) NOT NULL,
  `criador` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_disciplinas_categorias` (`disciplina`),
  ADD KEY `fk_usuarios_categorias` (`criador`);

ALTER TABLE `conteudos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_usuarios_conteudos` (`criador`),
  ADD KEY `fk_categorias_conteudos` (`categoria`),
  ADD KEY `fk_formats_conteudos` (`extensao`);
  

ALTER TABLE `disciplinas`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `extensoes`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `livros`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=11;

ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2;

ALTER TABLE `conteudos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2;

ALTER TABLE `disciplinas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=15;

ALTER TABLE `extensoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=9;

ALTER TABLE `livros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `categorias`
  ADD CONSTRAINT `fk_usuarios_categorias` FOREIGN KEY (`criador`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_disciplinas_categorias` FOREIGN KEY (`disciplina`) REFERENCES `disciplinas` (`id`);

ALTER TABLE `conteudos`
  ADD CONSTRAINT `fk_usuarios_conteudos` FOREIGN KEY (`criador`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_categorias_conteudos` FOREIGN KEY (`categoria`) REFERENCES `categorias` (`id`),
  ADD CONSTRAINT `fk_extensoes_conteudos` FOREIGN KEY (`extensao`) REFERENCES `extensoes` (`id`);

ALTER TABLE `livros`
  ADD CONSTRAINT `fk_usuarios_livros` FOREIGN KEY (`criador`) REFERENCES `usuarios` (`id`);
  
  use moovick;
  select * from usuarios;
 
 select * from categorias;
 
 delete from usuarios where id=11;
