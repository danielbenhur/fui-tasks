# Plano — FUI Tasks como portal acessível

## Direção do produto

Transformar o FUI Tasks em um pequeno launcher web para Kindle e navegadores simples: uma página inicial clara dá acesso ao organizador de tarefas e ao Virtual TCC, mantendo a possibilidade de adicionar apps leves no futuro.

## Design

- **Movimento:** utilitário e-ink minimalista, inspirado em launchers de leitores digitais como o ReKindle.
- **Princípios:** legibilidade primeiro; poucos caminhos; estados sempre explícitos; baixo consumo e carregamento rápido.
- **Cor:** preto, branco e cinzas para alto contraste e telas e-ink; bordas sólidas e um cinza de destaque substituem gradientes e sombras.
- **Layout:** portal em coluna única com cartões de entrada; cada app ocupa uma tela própria dentro do mesmo shell.
- **Elementos de assinatura:** wordmark “FUI /” em caixa alta; cartões com borda dupla; marcador textual de status “local / conectado / demonstração”.
- **Interação:** botões grandes, foco visível, navegação por teclado, sem gestos ou animações obrigatórias.
- **Animação:** nenhuma; mudanças de tela são imediatas.
- **Tipografia:** Georgia/serif do sistema para leitura confortável e Arial/serif fallback em controles; títulos curtos e corpo com altura de linha generosa.
- **Essência:** um painel de ferramentas calmas para organizar o dia e pensar com mais clareza; simples, acessível, cuidadoso.
- **Voz:** direta, acolhedora e honesta. Exemplos: “Escolha uma ferramenta para começar.” / “Vamos examinar isso juntos, uma pergunta por vez.”
- **Marca:** “FUI /” funciona como um marcador de caderno, com a barra indicando passagem entre ferramentas.

## Arquitetura

- `server.js`: servidor Node sem framework; entrega arquivos estáticos e o proxy `POST /api/tcc/chat`.
- `server/tcc-prompt.js`: prompt de sistema privado, baseado no prompt fornecido pelo usuário.
- `public/index.html`: shell, portal, FUI Tasks e Virtual TCC.
- `public/styles.css`: estilo acessível/e-ink, responsivo e sem dependências.
- `public/app.js`: navegação, tarefas, mapa simples, conversa local e chamadas ao proxy.
- `public/manifest.json` e `public/sw.js`: suporte PWA progressivo, sem tornar o app dependente de Service Worker.
- `public/manus-routes.json`: rotas de página declaradas para o Webdev.

## IA e segurança

O servidor usa o endpoint OpenAI-compatible do Hugging Face (`router.huggingface.co/v1/chat/completions`) quando `HF_TOKEN` existe; o token permanece somente no ambiente do servidor. Sem token, o Virtual TCC entra em modo demonstração honesto, sem fingir que há uma IA ativa. O aplicativo informa que não é emergência nem substitui psicoterapia. Mensagens com sinais de suicídio, autolesão, violência iminente ou incapacidade de permanecer seguro recebem resposta de segurança antes de qualquer chamada ao modelo.

O Hugging Face não garante API gratuita ilimitada: a integração deve tratar limites, 429 e indisponibilidade sem prometer continuidade gratuita.
