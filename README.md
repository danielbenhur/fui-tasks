# FUI Tasks / Virtual TCC

Portal leve e acessivel para Kindle e navegadores simples. A pagina inicial oferece o FUI Tasks e o Virtual TCC, com espaco para outros aplicativos pequenos no futuro.

## Hugging Face

O servidor prioriza a API Google Gemini em `https://generativelanguage.googleapis.com`, mantendo `GEMINI_API_KEY` somente no ambiente do servidor. O modelo padrao e `gemini-flash-lite-latest`, um alias leve disponivel para conversas curtas; ele pode ser trocado pela variavel `GEMINI_MODEL`. O Hugging Face (`HF_TOKEN`) permanece como alternativa quando nao ha chave Gemini.

Nao existe uma chave de API gratuita e ilimitada garantida. Os limites dependem da conta, do modelo e do provedor selecionado pelo Hugging Face. Um token valido nao garante creditos: quando a API responde HTTP 402 por falta de creditos, o Virtual TCC informa essa situacao e usa uma resposta demonstrativa, sem fingir que a IA respondeu.

Para ativar a IA com Gemini, gere uma chave no Google AI Studio e salve-a como secret de ambiente do servidor com o nome `GEMINI_API_KEY`. Nunca coloque a chave no `public/`, em JavaScript do navegador, no Git ou em mensagens. O modelo pode ser alterado com `GEMINI_MODEL`.

## Teste local

```bash
GEMINI_API_KEY=sua_chave GEMINI_MODEL=gemini-flash-lite-latest node server.js
```

Sem token:

```bash
node server.js
```

Abra `http://127.0.0.1:3000/`. Para testar em um Kindle na mesma rede, use `node server.js` na maquina servidora e abra `http://IP-DA-MAQUINA:3000/`.

## Seguranca e limites

O Virtual TCC nao diagnostica, nao prescreve e nao substitui psicoterapia ou atendimento medico. Mensagens com sinais de suicidio, autolesao, violencia iminente ou incapacidade de permanecer seguro recebem orientacao de seguranca antes da chamada ao modelo. Em risco imediato, procure o servico de emergencia local; no Brasil, SAMU 192, Policia 190 e CVV 188 podem ser referencias iniciais.

A conversa e as tarefas ficam no `localStorage` do navegador. Quando a IA esta conectada, as mensagens necessarias passam pelo servidor e pelo provedor configurado; nao use o app para compartilhar dados que voce nao quer enviar a um servico externo.

## Publicacao

O GitHub Pages hospeda os arquivos estaticos na URL `https://danielbenhur.github.io/fui-tasks/`. Quando aberto nesse dominio, o cliente usa temporariamente o backend Manus em `https://8328-i0hzjeae918ph7lzoqhhp-e59854ca.us4.manus.computer`, e o backend chama o Hugging Face mantendo `HF_TOKEN` fora do navegador. O servidor aceita CORS somente do dominio `https://danielbenhur.github.io` (alem de localhost para desenvolvimento).

O servidor Node deve ser publicado como container/backend para uma URL permanente; o endereco de Preview do Manus e adequado para esta fase, mas pode mudar ou ficar indisponivel fora da sessao. O portal estatico e o modo demonstracao tambem funcionam sem o backend de IA. O `Dockerfile` ja escuta em `PORT` (padrao 3000).
