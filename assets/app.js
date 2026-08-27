/**
 * Dashboard Gerencial de Telefonia
 * Lógica de filtros, renderização e interatividade.
 */

// ──────────────────────────────────────────
//  Estado Global
// ──────────────────────────────────────────
let statusFiltro = null;
let DADOS = [];
let APARELHOS = [];
let COMP  = {};
const ordenacao = {
  resumo: { campo: 'val', direcao: 'desc' },
  detalhes: { campo: null, direcao: 'asc' }
};

const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const esc = v => String(v||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ──────────────────────────────────────────
//  Bootstrap
// ──────────────────────────────────────────
async function init() {
  if (window.DADOS_TELEFONIA?.dados?.length) {
    DADOS = window.DADOS_TELEFONIA.dados;
    APARELHOS = window.DADOS_TELEFONIA.aparelhos || [];
    COMP  = window.DADOS_TELEFONIA.comparativo || {};
    document.getElementById('timestampDashboard').textContent =
      'Aba Planos · Atualizado em ' + (window.DADOS_TELEFONIA.gerado_em || '—');
  } else {
    try {
      const r = await fetch('dados/dados_dashboard.json');
      if (r.ok) { const j = await r.json(); DADOS = j.dados||[]; APARELHOS = j.aparelhos||[]; COMP = j.comparativo||{}; }
    } catch(e) { /* sem servidor local, continua */ }
  }

  document.getElementById('avisoDados').style.display = (DADOS.length || APARELHOS.length) ? 'none' : 'block';
  if (!DADOS.length && !APARELHOS.length) {
    return;
  }

  preencherSelectCdc();
  document.getElementById('filtroOperadora').addEventListener('change', atualizarTudo);
  document.getElementById('filtroCdc').addEventListener('change', atualizarTudo);
  document.getElementById('buscaTexto').addEventListener('input', atualizarDetalhe);
  document.getElementById('buscaAparelhos').addEventListener('input', atualizarAparelhos);
  atualizarTudo();
  atualizarAparelhos();
}

// ──────────────────────────────────────────
//  Filtros
// ──────────────────────────────────────────
function preencherSelectCdc() {
  const s = document.getElementById('filtroCdc');
  const unicos = [...new Map(DADOS.map(d => [d.codCdc+'|'+d.cdc, d])).values()]
    .sort((a,b) => (a.codCdc+' '+a.cdc).localeCompare(b.codCdc+' '+b.cdc, 'pt-BR'));
  s.innerHTML = '<option value="TODOS">Todos os Centros de Custo</option>' +
    unicos.map(c => `<option value="${esc(c.codCdc+'|'+c.cdc)}">${esc(c.codCdc+' — '+c.cdc)}</option>`).join('');
}

function obterFiltrados() {
  const op  = document.getElementById('filtroOperadora').value;
  const cdc = document.getElementById('filtroCdc').value;
  return DADOS.filter(d => {
    const okOp  = op  === 'TODAS' || d.operadora === op;
    const okCdc = cdc === 'TODOS' || (d.codCdc+'|'+d.cdc) === cdc;
    const okSt = !statusFiltro
      || (statusFiltro === 'FROTA' && String(d.chapaCpf || '').trim().toUpperCase() === 'FROTA')
      || d.status === statusFiltro;
    return okOp && okCdc && okSt;
  });
}

function selecionarFiltroCard(st) {
  statusFiltro = statusFiltro === st ? null : st;
  atualizarTudo();
}

function filtrarCdcTabela(chave) {
  document.getElementById('filtroCdc').value = chave;
  atualizarTudo();
}

function limparFiltrosDetalhe() {
  statusFiltro = null;
  document.getElementById('filtroOperadora').value = 'TODAS';
  document.getElementById('filtroCdc').value = 'TODOS';
  document.getElementById('buscaTexto').value = '';
  atualizarTudo();
}

function ordenarTabela(tabela, campo) {
  const atual = ordenacao[tabela];
  atual.direcao = atual.campo === campo && atual.direcao === 'asc' ? 'desc' : 'asc';
  atual.campo = campo;
  atualizarTudo();
}

function ordenarLinhas(linhas, tabela) {
  const { campo, direcao } = ordenacao[tabela];
  if (!campo) return linhas;
  return [...linhas].sort((a, b) => {
    const valorA = a[campo] ?? '';
    const valorB = b[campo] ?? '';
    const comparacao = typeof valorA === 'number' && typeof valorB === 'number'
      ? valorA - valorB
      : String(valorA).localeCompare(String(valorB), 'pt-BR', { numeric: true, sensitivity: 'base' });
    return direcao === 'asc' ? comparacao : -comparacao;
  });
}

async function copiarNumero(numero, botao) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(numero || ''));
    } else {
      const auxiliar = document.createElement('textarea');
      auxiliar.value = String(numero || '');
      document.body.appendChild(auxiliar);
      auxiliar.select();
      document.execCommand('copy');
      auxiliar.remove();
    }
    botao.classList.add('copied');
    botao.innerHTML = '<i class="fa-solid fa-check"></i>';
    botao.title = 'Número copiado';
    setTimeout(() => {
      botao.classList.remove('copied');
      botao.innerHTML = '<i class="fa-regular fa-copy"></i>';
      botao.title = 'Copiar número';
    }, 1200);
  } catch (e) {
    botao.title = 'Não foi possível copiar';
  }
}

// ──────────────────────────────────────────
//  Totalizador Dinâmico
// ──────────────────────────────────────────
function renderizarTotalizador(itens) {
  const op  = document.getElementById('filtroOperadora').value;
  const cdc = document.getElementById('filtroCdc').value;

  const custo = itens.reduce((s,d) => s + (d.valor||0), 0);
  const qtd   = itens.length;

  const labels = [];
  if (op  !== 'TODAS') labels.push(op);
  if (cdc !== 'TODOS') labels.push(cdc.split('|')[1] || cdc);
  if (statusFiltro)    labels.push(statusFiltro);

  document.getElementById('totalLabel').textContent    = labels.length ? 'Custo Filtrado' : 'Custo Total Geral';
  document.getElementById('totalValor').textContent    = fmt(custo);
  document.getElementById('totalContexto').textContent =
    qtd.toLocaleString('pt-BR') + ' linha' + (qtd !== 1 ? 's' : '') +
    (labels.length ? ' · ' + labels.join(' · ') : '');

  // Pills por status
  const ts = { ATIVA:0, ESTOQUE:0, DESLIGADO:0, VERIFICAR:0 };
  itens.forEach(d => { if (ts[d.status] !== undefined) ts[d.status]++; });
  document.getElementById('pillQtdAtiva').textContent     = ts.ATIVA;
  document.getElementById('pillQtdEstoque').textContent   = ts.ESTOQUE;
  document.getElementById('pillQtdDesligado').textContent = ts.DESLIGADO;
  document.getElementById('pillQtdVerificar').textContent = ts.VERIFICAR;

  // Badge de delta (somente sem filtros ativos)
  const deltaEl = document.getElementById('totalDeltaBadge');
  if (COMP.tem_anterior && COMP.custo_total?.tem_anterior && !labels.length) {
    const pct = COMP.custo_total.pct;
    deltaEl.style.display = 'block';
    deltaEl.textContent = (pct > 0 ? '▲ +' : '▼ ') + pct + '% vs. ' + (COMP.data_anterior?.split(' às')[0] || '');
  } else {
    deltaEl.style.display = 'none';
  }
}

// ──────────────────────────────────────────
//  Cards de Status
// ──────────────────────────────────────────
function renderizarCards(itens) {
  const t = { ATIVA:{q:0,v:0}, ESTOQUE:{q:0,v:0}, DESLIGADO:{q:0,v:0}, VERIFICAR:{q:0,v:0}, FROTA:{q:0,v:0} };
  itens.forEach(d => {
    if (t[d.status]) { t[d.status].q++; t[d.status].v += (d.valor||0); }
    if (String(d.chapaCpf || '').trim().toUpperCase() === 'FROTA') {
      t.FROTA.q++;
      t.FROTA.v += (d.valor || 0);
    }
  });

  ['Ativa','Estoque','Desligado','Verificar','Frota'].forEach(k => {
    const ch = k.toUpperCase();
    document.getElementById('qtd'+k).textContent = t[ch].q.toLocaleString('pt-BR');
    document.getElementById('val'+k).textContent = fmt(t[ch].v);
    document.getElementById('card'+k)?.classList.toggle('selected', statusFiltro === ch);
  });

  renderBadge('badgeAtiva',    'subAtiva',    COMP.ATIVA);
  renderBadge('badgeEstoque',  'subEstoque',  COMP.ESTOQUE);
  renderBadge('badgeDesligado','subDesligado',COMP.DESLIGADO);
  renderBadge('badgeVerificar','subVerificar',COMP.VERIFICAR);
}

function renderBadge(idB, idS, delta) {
  const el  = document.getElementById(idB);
  const sub = document.getElementById(idS);
  if (!el) return;
  if (!COMP.tem_anterior || !delta?.tem_anterior) { el.style.display = 'none'; return; }
  el.style.display = 'inline-flex';
  const p = delta.pct;
  el.className = 'trend-badge ' + (p === 0 ? 'neutral' : p < 0 ? 'down' : 'up');
  el.textContent = p === 0 ? '0%' : (p < 0 ? '▼ ' + Math.abs(p) : '▲ +' + p) + '%';
  if (sub && COMP.data_anterior) sub.textContent = 'vs. ' + COMP.data_anterior.split(' às')[0];
}

// ──────────────────────────────────────────
//  Gráficos de Barras
// ──────────────────────────────────────────
function renderizarGraficos(itens) {
  const mapa = new Map();
  itens.forEach(d => {
    const k = d.codCdc + ' — ' + d.cdc;
    if (!mapa.has(k)) mapa.set(k, { nome:k, valor:0, pend:0 });
    const c = mapa.get(k);
    c.valor += (d.valor||0);
    if (d.status === 'VERIFICAR' || d.status === 'DESLIGADO') c.pend++;
  });
  const lista = [...mapa.values()];

  // Top 8 por custo
  const topCusto = [...lista].sort((a,b) => b.valor - a.valor).slice(0, 8);
  const maxC = topCusto[0]?.valor || 1;
  document.getElementById('graficoCusto').innerHTML = topCusto.length
    ? topCusto.map(c => `
        <div class="barra-item">
          <div class="barra-info">
            <span class="barra-nome" title="${esc(c.nome)}">${esc(c.nome)}</span>
            <span style="font-weight:700;color:var(--primary)">${fmt(c.valor)}</span>
          </div>
          <div class="barra-trilha">
            <div class="barra-fill" style="width:${(c.valor/maxC)*100}%;background:var(--primary)"></div>
          </div>
        </div>`).join('')
    : '<p class="vazio">Sem dados para os filtros atuais</p>';

  // Top 8 por pendências
  const topPend = [...lista].filter(c => c.pend > 0).sort((a,b) => b.pend - a.pend).slice(0, 8);
  const maxP = topPend[0]?.pend || 1;
  document.getElementById('graficoPendencias').innerHTML = topPend.length
    ? topPend.map(c => `
        <div class="barra-item">
          <div class="barra-info">
            <span class="barra-nome" title="${esc(c.nome)}">${esc(c.nome)}</span>
            <span style="font-weight:700;color:var(--verificar)">${c.pend} pendência(s)</span>
          </div>
          <div class="barra-trilha">
            <div class="barra-fill" style="width:${(c.pend/maxP)*100}%;background:var(--verificar)"></div>
          </div>
        </div>`).join('')
    : '<p class="vazio">Nenhuma pendência encontrada</p>';
}

// ──────────────────────────────────────────
//  Tabela — Resumo por CDC
// ──────────────────────────────────────────
function renderizarResumoCdc(itens) {
  const grupos = new Map();
  itens.forEach(d => {
    const k = d.codCdc+'|'+d.cdc;
    if (!grupos.has(k)) grupos.set(k, { cod:d.codCdc, cdc:d.cdc, ATIVA:0, ESTOQUE:0, DESLIGADO:0, VERIFICAR:0, val:0 });
    const g = grupos.get(k);
    g[d.status] = (g[d.status]||0) + 1;
    g.val += (d.valor||0);
  });
  const linhas = ordenarLinhas([...grupos.values()], 'resumo');

  document.getElementById('tabelaResumoCdc').innerHTML = linhas.map(g => `
    <tr onclick="filtrarCdcTabela('${esc(g.cod+'|'+g.cdc)}')">
      <td><strong>${esc(g.cod)}</strong></td>
      <td>${esc(g.cdc)}</td>
      <td class="num">${g.ATIVA}</td>
      <td class="num">${g.ESTOQUE}</td>
      <td class="num" style="color:var(--desligado);font-weight:700">${g.DESLIGADO || '—'}</td>
      <td class="num" style="color:var(--verificar);font-weight:700">${g.VERIFICAR || '—'}</td>
      <td class="num" style="font-weight:700">${fmt(g.val)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="vazio">Nenhum CDC encontrado</td></tr>';

  // Rodapé com totais
  const tot = { ATIVA:0, ESTOQUE:0, DESLIGADO:0, VERIFICAR:0, val:0 };
  linhas.forEach(g => { tot.ATIVA+=g.ATIVA; tot.ESTOQUE+=g.ESTOQUE; tot.DESLIGADO+=g.DESLIGADO; tot.VERIFICAR+=g.VERIFICAR; tot.val+=g.val; });
  document.getElementById('tfAtiva').textContent     = tot.ATIVA.toLocaleString('pt-BR');
  document.getElementById('tfEstoque').textContent   = tot.ESTOQUE.toLocaleString('pt-BR');
  document.getElementById('tfDesligado').textContent = tot.DESLIGADO.toLocaleString('pt-BR');
  document.getElementById('tfVerificar').textContent = tot.VERIFICAR.toLocaleString('pt-BR');
  document.getElementById('tfCusto').textContent     = fmt(tot.val);
}

// ──────────────────────────────────────────
//  Tabela — Detalhamento de Linhas
// ──────────────────────────────────────────
function atualizarDetalhe() {
  const busca = document.getElementById('buscaTexto').value.trim().toLowerCase();
  let itens = obterFiltrados().filter(d => {
    if (!busca) return true;
    return (d.nome||'').toLowerCase().includes(busca) ||
           (d.linha||'').toLowerCase().includes(busca) ||
           (d.chapaCpf||'').toLowerCase().includes(busca) ||
           (d.codCdc||'').toLowerCase().includes(busca) ||
           (d.cdc||'').toLowerCase().includes(busca);
  });
  itens = ordenarLinhas(itens, 'detalhes');

  const custo = itens.reduce((s,d) => s + (d.valor||0), 0);
  document.getElementById('contadorDetalhes').textContent = itens.length.toLocaleString('pt-BR') + ' registro(s)';
  document.getElementById('totalDetalhes').textContent    = fmt(custo);
  document.getElementById('tfDetalhes').textContent       = fmt(custo);

  document.getElementById('tabelaDetalhes').innerHTML = itens.map(d => `
    <tr>
      <td>${esc(d.operadora)}</td>
      <td><strong>${esc(d.linha)}</strong><button class="copy-number" data-numero="${esc(d.linha)}" title="Copiar número" aria-label="Copiar número ${esc(d.linha)}" onclick="copiarNumero(this.dataset.numero, this)"><i class="fa-regular fa-copy"></i></button></td>
      <td>${esc(d.chapaCpf)}</td>
      <td>${esc(d.nome)}</td>
      <td>${esc(d.codCdc)}</td>
      <td>${esc(d.cdc)}</td>
      <td class="num">${fmt(d.valor)}</td>
      <td><span class="tag ${d.status.toLowerCase()}">${esc(d.status)}</span></td>
    </tr>`).join('') || '<tr><td colspan="8" class="vazio">Nenhum registro encontrado</td></tr>';
}

// ──────────────────────────────────────────
//  Tabela — Aparelhos patrimoniais
// ──────────────────────────────────────────
function atualizarAparelhos() {
  const busca = document.getElementById('buscaAparelhos').value.trim().toLowerCase();
  const itens = APARELHOS.filter(a => !busca || [
    a.patrimonio, a.modelo, a.linha, a.chapa, a.nome, a.codCdc, a.cdc, a.serie, a.status
  ].some(v => String(v || '').toLowerCase().includes(busca)));
  const totais = { ATIVA: 0, ESTOQUE: 0, DESLIGADO: 0, VERIFICAR: 0 };
  itens.forEach(a => { if (totais[a.status] !== undefined) totais[a.status]++; });
  document.getElementById('contadorAparelhos').textContent = itens.length.toLocaleString('pt-BR') + ' aparelho(s)';
  document.getElementById('resumoAparelhos').textContent =
    `Ativos: ${totais.ATIVA} · Estoque: ${totais.ESTOQUE} · Verificar: ${totais.VERIFICAR}`;
  document.getElementById('tabelaAparelhos').innerHTML = itens.map(a => `
    <tr>
      <td><strong>${esc(a.patrimonio)}</strong></td>
      <td>${esc(a.modelo)}</td>
      <td>${esc(a.linha || '—')}</td>
      <td>${esc(a.chapa || '—')}</td>
      <td>${esc(a.nome || '—')}</td>
      <td>${esc(a.codCdc)}</td>
      <td>${esc(a.cdc)}</td>
      <td>${esc(a.serie || '—')}</td>
      <td><span class="tag ${String(a.status).toLowerCase()}">${esc(a.status)}</span></td>
    </tr>`).join('') || '<tr><td colspan="9" class="vazio">Nenhum aparelho encontrado</td></tr>';
}

// ──────────────────────────────────────────
//  Orquestrador
// ──────────────────────────────────────────
function atualizarTudo() {
  const itens = obterFiltrados();
  renderizarTotalizador(itens);
  renderizarCards(itens);
  renderizarGraficos(itens);
  renderizarResumoCdc(itens);
  atualizarDetalhe();
}

function mostrarSecao(secao) {
  const aparelhos = secao === 'aparelhos';
  document.getElementById('secaoLinhas').hidden = aparelhos;
  document.getElementById('abaAparelhos').hidden = !aparelhos;
  document.getElementById('btnLinhas').classList.toggle('active', !aparelhos);
  document.getElementById('btnAparelhos').classList.toggle('active', aparelhos);
  if (aparelhos) atualizarAparelhos();
}

function trocarAba(evt, id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (evt?.currentTarget) evt.currentTarget.classList.add('active');
  document.getElementById(id)?.classList.add('active');
}

window.addEventListener('DOMContentLoaded', init);
