# Dashboard de Telefonia

## ⚠️ O problema

As informações de telefonia ficam em planilhas operacionais e precisam ser conferidas antes de uma decisão. Sem uma visão consolidada, é difícil enxergar custos, pendências, linhas desligadas e aparelhos vinculados.

## ✅ A solução

Este dashboard transforma a base tratada pela Automação de Telefonia em uma visão simples para consulta no navegador.

Ele mostra indicadores, filtros e listas de linhas e aparelhos. O dashboard não consulta o SIGO e não altera a planilha operacional.

~~~text
Planilhas corporativas
        ↓
Automação de Telefonia
        ↓
Base do dashboard
        ↓
Dashboard de Telefonia
~~~

## ▶️ Como utilizar

### Consultar o dashboard

1. No repositório da automação, execute a opção **1 — Atualizar dados e Dashboard Gerencial**.
2. Aguarde a conclusão do processo.
3. Abra **index.html** nesta pasta.

Os dados exibidos são carregados destes arquivos:

- **dados\dados_dashboard.js**
- **dados\dados_dashboard.json**
- **dados\historico_dashboard.json**

### Enviar o dashboard para o Git

1. Atualize e confira o dashboard.
2. No menu da automação, execute a opção **6 — Anonimizar base do Dashboard para Git**. Ela substitui nomes, linhas, CPF, chapas, CDCs, patrimônio, série e IMEI por valores fictícios.
3. Revise o dashboard anonimizado.
4. Faça o commit e o envio ao Git somente depois dessa revisão.

⚠️ A automação agendada pode gerar novamente dados identificáveis a cada 30 minutos. Depois de anonimizar, envie ao Git antes da próxima atualização automática ou anonimize outra vez imediatamente antes do envio.

Os arquivos de backup gerados pela anonimização são ignorados pelo Git.

## 📌 Regras

- O dashboard é para consulta e acompanhamento; ele não é a fonte operacional.
- Não envie ao Git dados pessoais, linhas telefônicas reais, centros de custo identificáveis, credenciais ou planilhas brutas.
- Não edite manualmente os arquivos da pasta **dados**. Eles são atualizados pela automação.
- Sempre execute a anonimização antes de publicar uma versão atualizada do dashboard.
- Os valores fictícios preservam os vínculos usados pelos filtros e totais, incluindo a identificação de **FROTA**.
- Para corrigir informações de linhas, use a planilha corporativa e a automação, não o dashboard.

## ℹ️ Informações importantes

### Onde encontrar cada item

~~~text
00 - DASHBOARD/
├── index.html                 # painel para abrir no navegador
├── assets/                    # estilo e comportamento visual
├── dados/
│   ├── dados_dashboard.js     # dados usados pelo painel
│   ├── dados_dashboard.json   # mesma base em JSON
│   └── historico_dashboard.json
└── README.MD                  # esta documentação
~~~

### Quando o dashboard parecer desatualizado

Verifique o log da automação em **04 - SAIDAS\LOGS\atualizacao_dashboard.log**. Se a atualização foi concluída com sucesso, feche e abra novamente o **index.html**.
