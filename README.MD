# Dashboard de Telefonia

Este repositório contém exclusivamente o dashboard de acompanhamento de Telefonia e a base consolidada utilizada para sua visualização.

## Origem dos dados

Os dados exibidos no dashboard são gerados pelo repositório de **Automação de Telefonia**.

O fluxo é:

```text
Bases operacionais
→ Automação de Telefonia
→ Tratamento e validação dos dados
→ Anonimização
→ Base consolidada do dashboard
→ Dashboard de Telefonia
```

A automação é responsável por importar, tratar, validar e consolidar os dados. Este repositório não executa essas etapas e não deve ser usado como fonte operacional.

## Dados versionados

Apenas a base final, já tratada e anonimizada, deve ser enviada a este repositório. Não devem ser incluídos dados brutos, arquivos operacionais, credenciais ou informações pessoais identificáveis.

A base do dashboard deve ficar na pasta:

```text
data/
```

Exemplo:

```text
data/base_dashboard.csv
```

## Atualização da base

Antes de atualizar os dados no Git:

1. Execute a automação no repositório de Automação de Telefonia.
2. Gere a base consolidada destinada ao dashboard.
3. Execute localmente o script de anonimização.
4. Valide se a base final não contém dados pessoais ou sensíveis.
5. Substitua o arquivo em `data/`.
6. Atualize o dashboard e envie as alterações ao Git.

## Anonimização

O script Python de anonimização é utilizado somente localmente antes do envio da base ao repositório.

Ele não é versionado, pois serve como ferramenta de apoio operacional. A regra é simples: nenhum dado deve ser enviado ao Git antes de passar pela anonimização e validação.

## Estrutura esperada

```text
.
├─ app/                    # Arquivos do dashboard
├─ assets/                 # Imagens e arquivos visuais
├─ data/
│  └─ base_dashboard.csv   # Base final, tratada e anonimizada
├─ README.md
└─ .gitignore
```

## Observação

Este repositório é destinado à visualização e compartilhamento controlado dos indicadores. A automação e os dados operacionais permanecem no repositório específico de Automação de Telefonia.