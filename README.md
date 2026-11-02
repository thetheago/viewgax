# viewgax

Editor visual da arquitetura Fortime: sistemas, comunicações (HTTP, filas, routing keys, payloads) e
fluxos passo a passo.

```sh
docker compose up -d --build   # http://localhost:5173 (hot reload com o código do host)
docker compose up -d --build -V  # depois de mudar dependências (recria o node_modules do container)
npm test                       # ou: docker compose exec viewgax npm test
```

Sem Docker: `npm install && npm run dev`.

## Como editar
- **Visões e fluxos**: `+` no menu lateral ou na tela inicial (clique no logo). Renomeie clicando no
  título; exclua pelo ✕ do card na tela inicial.
- **Detalhes**: clique num card, seta ou passo para ler; **Editar** no painel abre os campos.
- **Grupos** (colunas da esquerda para a direita): `+ Grupo`; clique no grupo para renomear e mudar a
  ordem; `Delete` apaga o grupo (os cards ficam).
- **Cards**: `+ Novo card` ou `+ Card existente`. Clique no card para editar nome, tecnologia, ícone
  (`bootstrap:*` ou `tech:*`), cor, pai ("dentro de"), grupo e detalhes.
- **Atalhos**: `Delete` tira o card selecionado da visão (ele continua no modelo; para apagar de vez,
  "Excluir do modelo" no painel). `Ctrl+C` / `Ctrl+V` duplica o card, também entre visões.
  `Ctrl+K` busca card, fila, routing key ou visão. `Ctrl+Z` / `Ctrl+Shift+Z` desfaz e refaz.
  No fluxo, `espaço` toca os passos sozinho e `←` / `→` anda um passo.
- **Exportar**: PNG ou SVG da visão inteira, no menu "Exportar…" da barra.
- **Edição simultânea**: se outra pessoa salvar antes, o app para de salvar e pede para recarregar
  (não sobrescreve o trabalho dela).
- **Comunicações / passos**: passe o mouse no card e arraste o ponto azul até outro card. Numa visão
  cria uma comunicação; num fluxo cria o próximo passo (os sistemas donos entram junto).
- **Detalhes da seta**: protocolo, explicação e campos livres (routing key, fila, ACK/DLQ…).
  O campo `payload` é formatado como JSON.
- **Balão do fluxo**: o texto "Explicação (balão)" do passo aparece ao navegar com ◀ ▶ (ou as setas
  do teclado).
- **Layout**: arraste e redimensione; "Sugerir layout" aplica Camadas → (respeita a ordem dos grupos)
  ou Grade.

## Onde fica salvo
Cada edição é salva sozinha (indicador no canto da barra lateral) no arquivo `DATA_FILE`
(`/app/storage/fortime.json` no container, no volume `viewgax-data`). Para ter o JSON numa pasta do host,
troque o volume no `compose.yml` por `./storage:/app/storage`. Na primeira execução o arquivo é criado a
partir de `data/fortime.json` (semente versionada). **Importar JSON** substitui tudo pelo arquivo escolhido.

Última gravação vence: duas pessoas editando ao mesmo tempo sobrescrevem uma à outra.
`npm run build` gera um site estático somente leitura (mostra a semente, sem salvar).
