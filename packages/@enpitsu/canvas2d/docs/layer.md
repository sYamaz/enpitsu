# layer

## renderer

```mermaid
flowchart

app --> |delegate render| renderer
renderer --> transformer
renderer --> model
```

## stroke

```mermaid
flowchart

app --> |pointer down/up/move| controller["enpitsu"]

controller --> model
controller --> transformer
```