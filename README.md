# viewgax

Editor visual da arquitetura Fortime: sistemas, comunicações (HTTP, filas, routing keys, payloads) e
fluxos passo a passo. Tudo vive num arquivo só, `data/fortime.json`.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # site estático em dist/ (sirva com qualquer servidor estático)
npm test
```

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
- **Comunicações / passos**: passe o mouse no card e arraste o ponto azul até outro card. Numa visão
  cria uma comunicação; num fluxo cria o próximo passo (os sistemas donos entram junto).
- **Detalhes da seta**: protocolo, explicação e campos livres (routing key, fila, ACK/DLQ…).
  O campo `payload` é formatado como JSON.
- **Balão do fluxo**: o texto "Explicação (balão)" do passo aparece ao navegar com ◀ ▶ (ou as setas
  do teclado).
- **Layout**: arraste e redimensione; "Sugerir layout" aplica Camadas → (respeita a ordem dos grupos)
  ou Grade.

## Salvar
As edições ficam no navegador até você clicar em **Exportar JSON** e commitar o arquivo em
`data/fortime.json`. **Importar JSON** carrega um arquivo exportado. Duas pessoas editando ao mesmo
tempo geram conflito no git nesse arquivo: combine quem edita.
