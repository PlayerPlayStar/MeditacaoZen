## O que é Meditação Zen? ##

![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)
![PHP](https://img.shields.io/badge/PHP-8.0-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

Meditação Zen é um aplicativo de meditação voltado para a redução da ansiedade, com foco em estudantes de nível superior.


## Para Desenvolvedores ##

O projeto foi desenvolvido utilizando principalmente PHP, MySQL e Docker. Para contribuir ou dar andamento com o desenvolvimento, basta clonar o repositório e baixar as dependências necessárias que podem ser obtidas nos sites oficiais abaixo:

- PHP: https://www.php.net/downloads.php
- MySQL: https://dev.mysql.com/downloads/installer/
- Docker: https://www.docker.com/products/docker-desktop/


## Algumas funcionalidades incluem: ##

- Sistema de usuários com registro e login: Os usuários podem criar contas, fazer login e gerenciar suas informações pessoais, como histórico de sessões e músicas próprias.
- Temporizador com opções de 5 à 30 minutos: É possível que os usuários escolham o tempo de meditação desejado.
- Efeito de fundo e música ambiente personalizável: Os usuários também podem escolher as cores de fundo, que possui uma animação de movimento suave, e a música desejada entre as opções fornecidas ou músicas carregadas por eles mesmos.
- Histórico de sessões: Cada usuário possui seu próprio histórico de sessões de meditação anteriores, incluindo informações como data e duração.
- Fácil instalação e inicialização: A instalação e início do aplicativo são feitos através do Docker, facilitando o processo para os usuários.


## Como iniciar o aplicativo? ##

1) É necessário ter o Docker Desktop instalado no computador para início e utilização do aplicativo.
Caso você já possua o Docker Desktop instalado, por favor pule para o passo 3. Caso não, siga para o passo 2 para realizar a instalação do Docker.

2) Acesse o site do Docker Desktop e faça o download e instalação do software:
https://www.docker.com/products/docker-desktop/

Após a instalação, abra o Docker Desktop e verifique se o serviço está rodando e atualizado.O Docker precisa estar instalado e pronto para iniciar os containers para funcionamento correto.

3) Clique com o botão direito do mouse no arquivo 1_start.ps1 (em /scripts) e em "Executar com o Powershell" e aguarde os containers subirem. Após os containers terem iniciado, o aplicativo é aberto automaticamente no navegador pelo link: http://localhost:8080

4) Após a utilização, clique com o botão direito do mouse no arquivo 2_pause.ps1 (em /scripts) e em "Executar com o Powershell" para parar os containers.


## Tecnologias Utilizadas ##

- Frontend: 
    - JavaScript, HTML, CSS: Utilizei essas tecnologias para criar a interface do usuário e a página de login/registro, bem como a página principal do aplicativo e a estilização das páginas, como por exemplo o efeito de fundo degradê. Também utilizei o JavaScript para interatividade e manipulação do DOM.
- Backend: 
    - PHP, MySQL: O PHP foi utilizado para lógica e manipulação dos dados, como o login e registro de usuários, enquanto o MySQL foi usado para armazenamento dos dados. 
- Docker: Container para execução do aplicativo


## Créditos das Músicas ##

Todas as músicas são licenciadas sob Creative Commons para uso não comercial:

| Categoria | Música | Artista | Licença |
|-----------|--------|---------|---------|
| Noite | Moonlight | Scott Buckley | CC BY 4.0 |
| Calmaria | Adrift Among Infinite Stars | Scott Buckley | CC BY 4.0 |
| Pôr do Sol | Harmony of the Earth | Alex-Productions | CC BY 3.0 |

**Links oficiais:**
- Scott Buckley: www.scottbuckley.com.au
- Alex-Productions: https://onsound.eu/
- Promovido por: https://www.chosic.com/free-music/all/
- Licenças: https://creativecommons.org/licenses/by/4.0/ | https://creativecommons.org/licenses/by/3.0/


## Licença ##

Esse projeto está sob a licença MIT, visto que é para conclusão de curso e não irei comercializado.
