# viewgax

Visualizador da arquitetura Fortime. O modelo é `model/fortime.c4` (DSL do [LikeC4](https://likec4.dev));
o LikeC4 só faz o parse — o desenho, o arrasto e os layouts são deste repo.

```sh
npm install
npm run dev      # http://localhost:5173 — recarrega ao salvar o .c4
npm run build    # site estático em dist/ (sirva com qualquer servidor estático)
npm test
```

## Editar o modelo
Edite `model/fortime.c4` (extensão LikeC4 do VS Code ajuda). Visões, grupos e fluxos (`dynamic view`)
vêm de lá. Na seta, o painel mostra `technology`, `description` e todo o `metadata`; a chave `payload`
é formatada como JSON quando for JSON válido:

```
metadata {
  routing_key 'punch-register.afd-line'
  payload '''
    { "tenant_id": 42, "point_register_id": 1001, "client_id": 7 }
  '''
}
```

## Layout
Arraste cards e redimensione containers; "Sugerir layout" aplica **Camadas →** (colunas na ordem dos
grupos da visão) ou **Grade**. Tudo fica salvo no navegador (`layout: local`) até você clicar em
**Baixar layout** e commitar o arquivo em `layouts/<visão>.json`. Ordem de carga: navegador → arquivo →
automático. Card novo no modelo entra na posição automática; os demais ficam onde estavam.
Renomear um elemento no `.c4` faz o card perder a posição salva.
