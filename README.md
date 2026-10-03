# FUI Tasks

## Resumo técnico
Aplicação single-page autocontida em `index.html`, sem frameworks ou dependências externas. A interface usa apenas preto, branco e cinzas, com tipografia de sistema serifada e sem animações para favorecer telas e-ink. O estado é agrupado em um objeto JavaScript ES5, salvo defensivamente em `localStorage`, e a prioridade derivada usa `P = F^3 * U^2 * I^1`; o mapa radial é desenhado com `div` e conexões rotacionadas, sem SVG, Canvas ou WebGL.

## Teste local

Na pasta deste arquivo, execute:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Em um computador da mesma rede Wi-Fi, descubra o IP local da máquina que está servindo o arquivo e abra no Kindle:

```text
http://IP-DA-MAQUINA:8000/
```

Exemplo: `http://192.168.1.20:8000/`.

O primeiro carregamento pode ser feito com o Kindle conectado à rede. Depois, o navegador mantém os dados em `localStorage`; para acesso offline completo, deixe a página aberta ou use o recurso de adicionar marcador/app disponível no firmware do aparelho. O arquivo não faz chamadas externas.

## Funcionalidades entregues

- Cadastro, edição, conclusão e exclusão de tarefas.
- Pesos F/U/I de 0 a 3 e prioridade calculada automaticamente.
- Ordenação crescente/decrescente por tarefa, categoria, F, U, I e P.
- Filtro por coluna com busca textual sem diferenciação de maiúsculas/minúsculas.
- Mapa radial com categorias recolhíveis e tamanho de bolha proporcional à prioridade.
- Persistência local com tratamento defensivo de falhas do `localStorage`.

## Melhorias futuras

1. Filtro e foco de categoria diretamente no mapa.
2. Tela de ajustes para alterar os pesos `f`, `u` e `i` sem editar o arquivo.
3. Backup e restauração por texto copiável, sem usar Blob/download.
4. Ajuda contextual curta para explicar a escala 0–3 e a fórmula de prioridade.
