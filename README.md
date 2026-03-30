# O que é Meditação Zen?

Meditação Zen é um aplicativo de meditação para redução de ansiedade com foco em estudantes de nível superior, para a Atividade Extensionista I e II da faculdade Uninter como meu projeto de conclusão de curso.
Curso: CST Ciência de Dados
Aluna: Victória Bertini Matos Andrade
RU: 3749478


## Algumas funcionalidades:

- Sistema de usuários com registro e login
- Temporizador com opções de 5 à 30 minutos
- Efeito de fundo e música ambiente
- Histórico de sessões
- Docker para fácil instalação


## Como iniciar o aplicativo?

1) É necessário ter o Docker Desktop instalado no computador para utilização do aplicativo. Caso você já tenha o Docker instalado, por favor pule para o passo 4. Caso não tenha, siga para o passo 2 para instalar o Docker Desktop.

2) Acesse o site do Docker Desktop e faça o download e instalação do software.
https://www.docker.com/products/docker-desktop/

3) Após a instalação, abra o Docker Desktop e verifique se o serviço está rodando. O Docker precisa estar instalado e atualizado para iniciar os containers.

4) Clique duas vezes no arquivo INICIAR.ps1 (ou clique com o botão direito do mouse e em "executar Powershell") e aguarde os containers subirem. Após os containers terem iniciado, o aplicativo é aberto automaticamente no navegador pelo link http://localhost:8080.


## Tecnologias Utilizadas ##

- Frontend: JavaScript, HTML, CSS
- Backend: PHP, MySQL
- Docker: Container para execução do aplicativo


## Créditos das Músicas ##

Os áudios usados no aplicativo (na pasta `assets/audio/manual/`) são apenas para fins de demonstração e não comerciais.
Seguem as licenças indicadas na página de origem:

- Noite (`assets/audio/manual/Noite/`):
      Moonlight by Scott Buckley | www.scottbuckley.com.au
      Music promoted by https://www.chosic.com/free-music/all/
      Creative Commons CC BY 4.0
      https://creativecommons.org/licenses/by/4.0/

- Calmaria (`assets/audio/manual/Calmaria/`):
      Adrift Among Infinite Stars by Scott Buckley | www.scottbuckley.com.au
      Music promoted by https://www.chosic.com/free-music/all/
      Creative Commons CC BY 4.0
      https://creativecommons.org/licenses/by/4.0/

- Pôr do Sol (`assets/audio/manual/Por do Sol/`):
      Harmony of the Earth by Alex- Productions | https://onsound.eu/
      Music promoted by https://www.chosic.com/free-music/all/
      Creative Commons CC BY 3.0
      https://creativecommons.org/licenses/by/3.0/



## Configuração do BD, Docker e senhas ##

### Banco de Dados
- As tabelas são criadas automaticamente e os índices ajudam nas consultas

### Segurança
- Senhas hasheadas com `password_hash()`
- Prepared statements para o SQL
- Validação de entrada

### Docker
- Volumes persistentes para guardar os dados dos usuários
- Health checks para garantir que os containers funcionem corretamente
- Logs centralizados
- Ambiente isolado


## Licença

Esse projeto está sob a licença MIT, visto que é para conclusão de curso e não irei comercializado.