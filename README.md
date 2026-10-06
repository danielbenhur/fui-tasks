# FUI Tasks / Virtual TCC

Portal leve e acessível para Kindle e navegadores simples. A página inicial oferece o FUI Tasks e o Virtual TCC, com espaço para outros aplicativos pequenos no futuro.

## Hugging Face

O servidor usa `https://router.huggingface.co/v1/chat/completions`, mantendo `HF_TOKEN` somente no ambiente do servidor. O modelo padrão é `Qwen/Qwen3-4B-Instruct-2507`; ele pode ser trocado pela variável `HF_MODEL` sem editar o código.

Não existe uma chave de API gratuita e ilimitada garantida. Os limites dependem da conta, do modelo e do provedor selecionado pelo Hugging Face. O app trata ausência de chave, limites e indisponibilidade sem expor o token: sem `HF_TOKEN`, o Virtual TCC funciona em modo demonstração honesto.

Para ativar a IA, crie uma conta no Hugging Face, gere um token de acesso com permissão mínima para inferência e configure o valor como secret de ambiente do servidor com o nome `HF_TOKEN`. Nunca coloque o token no `public/`, em JavaScript do navegador, no Git ou em mensagens.

## Teste local

```bash
HF_TOKEN=seu_token HF_MODEL=Qwen/Qwen3-4B-Instruct-2507 node server.js
```

Sem token:

```bash
node server.js
```

Abra `http://127.0.0.1:3000/`. Para testar em um Kindle na mesma rede, use `node server.js` na máquina servidora e abra `http://IP-DA-MAQUINA:3000/`.

## Segurança e limites

O Virtual TCC não diagnostica, não prescreve e não substitui psicoterapia ou atendimento médico. Mensagens com sinais de suicídio, autolesão, violência iminente ou incapacidade de permanecer seguro recebem orientação de segurança antes da chamada ao modelo. Em risco imediato, procure o serviço de emergência local; no Brasil, SAMU 192, Polícia 190 e CVV 188 podem ser referências iniciais.

A conversa e as tarefas ficam no `localStorage` do navegador. Quando a IA está conectada, as mensagens necessárias passam pelo servidor e pelo provedor configurado; não use o app para compartilhar dados que você não quer enviar a um serviço externo.

## Publicação

O servidor Node deve ser publicado como container/backend para que `/api/tcc/chat` possa usar `HF_TOKEN`. O portal estático e o modo demonstração também funcionam sem o backend de IA. O `Dockerfile` já escuta em `PORT` (padrão 3000).
