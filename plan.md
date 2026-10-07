# Plano - FUI Tasks como portal acessivel

## Direcao do produto

Transformar o FUI Tasks em um pequeno launcher web para Kindle e navegadores simples: uma pagina inicial clara da acesso ao organizador de tarefas e ao Virtual TCC, mantendo a possibilidade de adicionar apps leves no futuro.

## Design

- **Movimento:** utilitario e-ink minimalista, inspirado em launchers de leitores digitais como o ReKindle.
- **Principios:** legibilidade primeiro; poucos caminhos; estados sempre explicitos; baixo consumo e carregamento rapido.
- **Cor:** preto, branco e cinzas para alto contraste e telas e-ink; bordas solidas e um cinza de destaque substituem gradientes e sombras.
- **Layout:** portal em coluna unica com cartoes de entrada; cada app ocupa uma tela propria dentro do mesmo shell.
- **Elementos de assinatura:** wordmark "FUI /" em caixa alta; cartoes com borda dupla; marcador textual de status "local / conectado / demonstracao".
- **Interacao:** botoes grandes, foco visivel, navegacao por teclado, sem gestos ou animacoes obrigatorias.
- **Animacao:** nenhuma; mudancas de tela sao imediatas.
- **Tipografia:** Georgia/serif do sistema para leitura confortavel e Arial/serif fallback em controles; titulos curtos e corpo com altura de linha generosa.
- **Essencia:** um painel de ferramentas calmas para organizar o dia e pensar com mais clareza; simples, acessivel, cuidadoso.
- **Voz:** direta, acolhedora e honesta. Exemplos: "Escolha uma ferramenta para comecar." / "Vamos examinar isso juntos, uma pergunta por vez."
- **Marca:** "FUI /" funciona como um marcador de caderno, com a barra indicando passagem entre ferramentas.

## Arquitetura

- `server.js`: servidor Node sem framework; entrega arquivos estaticos e o proxy `POST /api/tcc/chat`.
- `server/tcc-prompt.js`: prompt de sistema privado, baseado no prompt fornecido pelo usuario.
- `public/index.html`: shell, portal, FUI Tasks e Virtual TCC.
- `public/styles.css`: estilo acessivel/e-ink, responsivo e sem dependencias.
- `public/app.js`: navegacao, tarefas, mapa simples, conversa local e chamadas ao proxy.
- `public/manifest.json` e `public/sw.js`: suporte PWA progressivo, sem tornar o app dependente de Service Worker.
- `public/manus-routes.json`: rotas de pagina declaradas para o Webdev.

## IA e seguranca

O servidor usa o endpoint OpenAI-compatible do Hugging Face (`router.huggingface.co/v1/chat/completions`) quando `HF_TOKEN` existe; o token permanece somente no ambiente do servidor. Sem token, o Virtual TCC entra em modo demonstracao honesto, sem fingir que ha uma IA ativa. O aplicativo informa que nao e emergencia nem substitui psicoterapia. Mensagens com sinais de suicidio, autolesao, violencia iminente ou incapacidade de permanecer seguro recebem resposta de seguranca antes de qualquer chamada ao modelo.

O Hugging Face nao garante API gratuita ilimitada: a integracao deve tratar limites, 429 e indisponibilidade sem prometer continuidade gratuita.
