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
let PARCELAMENTOS = [];
let VALIDACOES = [];
let COMPETENCIAS = [];
let competenciaSelecionada = '';
const ordenacao = {
  resumo: { campo: 'val', direcao: 'desc' },
  detalhes: { campo: null, direcao: 'asc' }
};

const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const esc = v => String(v||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function aplicarTema(tema) {
  const escuro = tema === 'dark';
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
  const botao = document.getElementById('btnTema');
  if (!botao) return;
  botao.setAttribute('aria-pressed', String(escuro));
  botao.title = escuro ? 'Ativar modo claro' : 'Ativar modo escuro';
  botao.innerHTML = escuro
    ? '<i class="fa-solid fa-sun"></i> <span>Modo claro</span>'
    : '<i class="fa-solid fa-moon"></i> <span>Modo escuro</span>';
}

function alternarTema() {
  const proximo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('temaDashboardTelefonia', proximo);
  aplicarTema(proximo);
}

// ──────────────────────────────────────────
//  Bootstrap
// ──────────────────────────────────────────
async function init() {
  const temaSalvo = localStorage.getItem('temaDashboardTelefonia');
  aplicarTema(temaSalvo || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (window.DADOS_TELEFONIA?.dados?.length) {
    DADOS = window.DADOS_TELEFONIA.dados;
    APARELHOS = window.DADOS_TELEFONIA.aparelhos || [];
    PARCELAMENTOS = window.DADOS_TELEFONIA.parcelamentos || [];
    VALIDACOES = window.DADOS_TELEFONIA.validacoes || [];
    COMPETENCIAS = window.DADOS_TELEFONIA.competencias || [];
    document.getElementById('timestampDashboard').textContent =
      'Aba Planos · Atualizado em ' + (window.DADOS_TELEFONIA.gerado_em || '—');
  } else {
    try {
      const r = await fetch('dados/dados_dashboard.json');
      if (r.ok) {
        const j = await r.json();
        DADOS = j.dados || [];
        APARELHOS = j.aparelhos || [];
        PARCELAMENTOS = j.parcelamentos || [];
        VALIDACOES = j.validacoes || [];
        COMPETENCIAS = j.competencias || [];
      }
    } catch(e) { /* sem servidor local, continua */ }
  }

  document.getElementById('avisoDados').style.display = (DADOS.length || APARELHOS.length || PARCELAMENTOS.length) ? 'none' : 'block';
  if (!DADOS.length && !APARELHOS.length && !PARCELAMENTOS.length) {
    return;
  }

  preencherCompetencias();
  preencherSelectCdc();
  preencherSelectCdcParcelas();
  renderizarAlertas();
  document.getElementById('filtroCompetencia').addEventListener('change', trocarCompetencia);
  document.getElementById('filtroOperadora').addEventListener('change', atualizarTudo);
  document.getElementById('filtroCdc').addEventListener('change', atualizarTudo);
  document.getElementById('buscaTexto').addEventListener('input', atualizarDetalhe);
  document.getElementById('buscaAparelhos').addEventListener('input', atualizarAparelhos);
  document.getElementById('filtroStatusParcela').addEventListener('change', atualizarParcelamentos);
  document.getElementById('filtroTermoParcela').addEventListener('change', atualizarParcelamentos);
  document.getElementById('filtroCdcParcela').addEventListener('change', atualizarParcelamentos);
  document.getElementById('buscaParcelamentos').addEventListener('input', atualizarParcelamentos);
  document.querySelectorAll('[data-status-parcela]').forEach(card => {
    const aplicarFiltro = () => filtrarParcelamentosPorStatus(card.dataset.statusParcela);
    card.addEventListener('click', aplicarFiltro);
    card.addEventListener('keydown', evento => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        aplicarFiltro();
      }
    });
  });
  atualizarTudo();
  atualizarAparelhos();
  atualizarParcelamentos();
}

// ──────────────────────────────────────────
//  Filtros
// ──────────────────────────────────────────
function rotuloCompetencia(comp) {
  if (!comp) return '—';
  const [ano, mes] = comp.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric' })
    .format(new Date(ano, mes - 1, 1)).replace(/^./, c => c.toUpperCase());
}

function competenciaAnterior(comp) {
  if (!comp) return '';
  const [ano, mes] = comp.split('-').map(Number);
  const data = new Date(ano, mes - 2, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function preencherCompetencias() {
  if (!COMPETENCIAS.length) {
    COMPETENCIAS = [...new Set([...DADOS, ...PARCELAMENTOS].map(x => x.competencia).filter(Boolean))].sort();
  }
  const comuns = COMPETENCIAS.filter(c => DADOS.some(d => d.competencia === c) && PARCELAMENTOS.some(p => p.competencia === c));
  competenciaSelecionada = comuns.at(-1) || COMPETENCIAS.at(-1) || '';
  const select = document.getElementById('filtroCompetencia');
  select.innerHTML = [...COMPETENCIAS].reverse().map(c => `<option value="${esc(c)}">${esc(rotuloCompetencia(c))}</option>`).join('');
  select.value = competenciaSelecionada;
  atualizarContextoCompetencia();
}

function trocarCompetencia() {
  competenciaSelecionada = document.getElementById('filtroCompetencia').value;
  statusFiltro = null;
  preencherSelectCdc();
  preencherSelectCdcParcelas();
  atualizarContextoCompetencia();
  atualizarTudo();
  atualizarParcelamentos();
}

function atualizarContextoCompetencia() {
  const anterior = competenciaAnterior(competenciaSelecionada);
  document.getElementById('competenciaAtual').textContent = rotuloCompetencia(competenciaSelecionada);
  const temAnterior = DADOS.some(d => d.competencia === anterior) || PARCELAMENTOS.some(p => p.competencia === anterior);
  document.getElementById('competenciaComparacao').textContent = temAnterior
    ? `Comparando com ${rotuloCompetencia(anterior)}`
    : 'Sem base anterior completa';
}

function renderizarAlertas() {
  const el = document.getElementById('avisoQualidade');
  if (!VALIDACOES.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><div><strong>Qualidade dos dados:</strong> ${VALIDACOES.map(v => esc(v.mensagem)).join(' · ')}</div>`;
}

function preencherSelectCdc() {
  const s = document.getElementById('filtroCdc');
  const unicos = [...new Map(DADOS.filter(d => d.competencia === competenciaSelecionada).map(d => [d.codCdc+'|'+d.cdc, d])).values()]
    .sort((a,b) => (a.codCdc+' '+a.cdc).localeCompare(b.codCdc+' '+b.cdc, 'pt-BR'));
  s.innerHTML = '<option value="TODOS">Todos os Centros de Custo</option>' +
    unicos.map(c => `<option value="${esc(c.codCdc+'|'+c.cdc)}">${esc(c.codCdc+' — '+c.cdc)}</option>`).join('');
}

function preencherSelectCdcParcelas() {
  const s = document.getElementById('filtroCdcParcela');
  const unicos = [...new Map(PARCELAMENTOS.filter(p => p.competencia === competenciaSelecionada).map(p => [p.codCdc+'|'+p.cdc, p])).values()]
    .sort((a,b) => (a.codCdc+' '+a.cdc).localeCompare(b.codCdc+' '+b.cdc, 'pt-BR'));
  s.innerHTML = '<option value="TODOS">Todos os Centros de Custo</option>' +
    unicos.map(c => `<option value="${esc(c.codCdc+'|'+c.cdc)}">${esc(c.codCdc+' — '+c.cdc)}</option>`).join('');
}

function obterFiltrados() {
  const op  = document.getElementById('filtroOperadora').value;
  const cdc = document.getElementById('filtroCdc').value;
  return DADOS.filter(d => {
    const okCompetencia = d.competencia === competenciaSelecionada;
    const okOp  = op  === 'TODAS' || d.operadora === op;
    const okCdc = cdc === 'TODOS' || (d.codCdc+'|'+d.cdc) === cdc;
    const okSt = !statusFiltro
      || (statusFiltro === 'FROTA' && String(d.chapaCpf || '').trim().toUpperCase() === 'FROTA')
      || d.status === statusFiltro;
    return okCompetencia && okOp && okCdc && okSt;
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

  const custoLinhas = itens.reduce((s,d) => s + (d.valor||0), 0);
  const semFiltros = op === 'TODAS' && cdc === 'TODOS' && !statusFiltro;
  const parcelasPagando = PARCELAMENTOS.filter(p => p.competencia === competenciaSelecionada && p.status === 'PAGANDO');
  const custoParcelas = parcelasPagando.reduce((s,p) => s + (p.valorMensal||0), 0);
  const custo = custoLinhas + (semFiltros ? custoParcelas : 0);
  const qtd   = itens.length;

  const labels = [];
  if (op  !== 'TODAS') labels.push(op);
  if (cdc !== 'TODOS') labels.push(cdc.split('|')[1] || cdc);
  if (statusFiltro)    labels.push(statusFiltro);

  document.getElementById('totalLabel').textContent    = labels.length ? 'Custo de Linhas Filtrado' : 'Custo Mensal Consolidado';
  document.getElementById('totalValor').textContent    = fmt(custo);
  document.getElementById('totalContexto').textContent =
    qtd.toLocaleString('pt-BR') + ' linha' + (qtd !== 1 ? 's' : '') +
    (semFiltros ? ` + ${parcelasPagando.length.toLocaleString('pt-BR')} parcela(s)` : '') +
    (labels.length ? ' · ' + labels.join(' · ') : '');

  // Pills por status
  const ts = { ATIVA:0, ESTOQUE:0, DESLIGADO:0, VERIFICAR:0 };
  itens.forEach(d => { if (ts[d.status] !== undefined) ts[d.status]++; });
  document.getElementById('pillQtdAtiva').textContent     = ts.ATIVA;
  document.getElementById('pillQtdEstoque').textContent   = ts.ESTOQUE;
  document.getElementById('pillQtdDesligado').textContent = ts.DESLIGADO;
  document.getElementById('pillQtdVerificar').textContent = ts.VERIFICAR;

  const deltaEl = document.getElementById('totalDeltaBadge');
  const anterior = competenciaAnterior(competenciaSelecionada);
  const linhasAnt = DADOS.filter(d => d.competencia === anterior);
  const parcelasAnt = PARCELAMENTOS.filter(p => p.competencia === anterior && p.status === 'PAGANDO');
  const temAnterior = linhasAnt.length > 0 && parcelasAnt.length > 0 && semFiltros;
  renderDelta(deltaEl, custo, linhasAnt.reduce((s,d)=>s+(d.valor||0),0) + parcelasAnt.reduce((s,p)=>s+(p.valorMensal||0),0), anterior, temAnterior);
}

function renderDelta(el, atual, anterior, competenciaAnt, disponivel=true) {
  if (!disponivel || anterior <= 0) {
    el.style.display = 'inline-flex';
    el.className = 'trend-badge neutral';
    el.textContent = 'Sem base anterior';
    return;
  }
  const diff = atual - anterior;
  const pct = (diff / anterior) * 100;
  el.style.display = 'inline-flex';
  el.className = 'trend-badge ' + (diff < 0 ? 'down' : diff > 0 ? 'up' : 'neutral');
  el.textContent = diff === 0 ? `0% vs. ${rotuloCompetencia(competenciaAnt)}` : `${diff < 0 ? '▼' : '▲'} ${Math.abs(pct).toFixed(1)}%`;
  el.title = `${fmt(Math.abs(diff))} ${diff < 0 ? 'a menos' : 'a mais'} vs. ${rotuloCompetencia(competenciaAnt)}`;
}

function renderizarResumoFinanceiro() {
  const anterior = competenciaAnterior(competenciaSelecionada);
  const linhas = DADOS.filter(d => d.competencia === competenciaSelecionada);
  const linhasAnt = DADOS.filter(d => d.competencia === anterior);
  const parcelas = PARCELAMENTOS.filter(p => p.competencia === competenciaSelecionada);
  const parcelasAnt = PARCELAMENTOS.filter(p => p.competencia === anterior);
  const pagando = parcelas.filter(p => p.status === 'PAGANDO');
  const pagandoAnt = parcelasAnt.filter(p => p.status === 'PAGANDO');
  const custoLinhas = linhas.reduce((s,d)=>s+(d.valor||0),0);
  const custoLinhasAnt = linhasAnt.reduce((s,d)=>s+(d.valor||0),0);
  const custoParcelas = pagando.reduce((s,p)=>s+(p.valorMensal||0),0);
  const custoParcelasAnt = pagandoAnt.reduce((s,p)=>s+(p.valorMensal||0),0);
  document.getElementById('custoLinhas').textContent = fmt(custoLinhas);
  document.getElementById('custoParcelas').textContent = fmt(custoParcelas);
  document.getElementById('custoConsolidado').textContent = fmt(custoLinhas + custoParcelas);
  document.getElementById('subCustoParcelas').textContent = `${pagando.length} parcelamento(s) pagando`;
  document.getElementById('qtdTermosPendentes').textContent = parcelas.filter(p => p.termo !== 'SIM').length.toLocaleString('pt-BR');
  renderDelta(document.getElementById('badgeCustoLinhas'), custoLinhas, custoLinhasAnt, anterior, linhasAnt.length > 0);
  renderDelta(document.getElementById('badgeCustoParcelas'), custoParcelas, custoParcelasAnt, anterior, parcelasAnt.length > 0);
  renderDelta(document.getElementById('badgeConsolidado'), custoLinhas + custoParcelas, custoLinhasAnt + custoParcelasAnt, anterior, linhasAnt.length > 0 && parcelasAnt.length > 0);
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

  renderBadge('badgeAtiva',    'subAtiva',    'ATIVA');
  renderBadge('badgeEstoque',  'subEstoque',  'ESTOQUE');
  renderBadge('badgeDesligado','subDesligado','DESLIGADO');
  renderBadge('badgeVerificar','subVerificar','VERIFICAR');
}

function renderBadge(idB, idS, delta) {
  const el  = document.getElementById(idB);
  const sub = document.getElementById(idS);
  if (!el || !delta) return;
  const anterior = competenciaAnterior(competenciaSelecionada);
  const atuais = DADOS.filter(d => d.competencia === competenciaSelecionada && d.status === delta);
  const anteriores = DADOS.filter(d => d.competencia === anterior && d.status === delta);
  renderDelta(el, atuais.reduce((s,d)=>s+(d.valor||0),0), anteriores.reduce((s,d)=>s+(d.valor||0),0), anterior, anteriores.length > 0);
  if (sub) sub.textContent = anteriores.length ? `vs. ${rotuloCompetencia(anterior)}` : 'Sem base anterior';
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
//  Parcelamentos mensais
// ──────────────────────────────────────────
function obterParcelamentosFiltrados() {
  const status = document.getElementById('filtroStatusParcela').value;
  const termo = document.getElementById('filtroTermoParcela').value;
  const cdc = document.getElementById('filtroCdcParcela').value;
  const busca = document.getElementById('buscaParcelamentos').value.trim().toLowerCase();
  return PARCELAMENTOS.filter(p => {
    const statusParcela = String(p.status || '').trim().toUpperCase();
    const termoParcela = String(p.termo || '').trim().toUpperCase();
    const okStatus = status === 'TODOS' || statusParcela === status;
    // "Pendente / vazio" deve trazer tanto termos marcados como NAO quanto campos em branco.
    const okTermo = termo === 'TODOS' || (termo === 'PENDENTE' ? termoParcela !== 'SIM' : termoParcela === termo);
    const okCdc = cdc === 'TODOS' || `${p.codCdc}|${p.cdc}` === cdc;
    const okBusca = !busca || [p.nome,p.linha,p.serie,p.codCdc,p.cdc].some(v => String(v||'').toLowerCase().includes(busca));
    return p.competencia === competenciaSelecionada && okStatus && okTermo && okCdc && okBusca;
  });
}

function atualizarParcelamentos() {
  const todos = PARCELAMENTOS.filter(p => p.competencia === competenciaSelecionada);
  const pagando = todos.filter(p => p.status === 'PAGANDO');
  const pagos = todos.filter(p => p.status === 'PAGO');
  const termosSim = todos.filter(p => p.termo === 'SIM');
  const termosPendentes = todos.filter(p => p.termo !== 'SIM');
  document.getElementById('qtdParcelasPagando').textContent = pagando.length.toLocaleString('pt-BR');
  document.getElementById('valParcelasPagando').textContent = fmt(pagando.reduce((s,p)=>s+(p.valorMensal||0),0));
  document.getElementById('qtdParcelasPagas').textContent = pagos.length.toLocaleString('pt-BR');
  document.getElementById('valParcelasPagas').textContent = fmt(pagos.reduce((s,p)=>s+(p.valorMensal||0),0));
  document.getElementById('qtdTermosSim').textContent = termosSim.length.toLocaleString('pt-BR');
  document.getElementById('qtdTermosNao').textContent = termosPendentes.length.toLocaleString('pt-BR');

  const itens = obterParcelamentosFiltrados();
  const total = itens.reduce((s,p)=>s+(p.valorMensal||0),0);
  document.getElementById('contadorParcelamentos').textContent = `${itens.length.toLocaleString('pt-BR')} registro(s)`;
  document.getElementById('totalParcelamentos').textContent = fmt(total);
  document.getElementById('tfParcelamentos').textContent = fmt(total);
  document.getElementById('tabelaParcelamentos').innerHTML = itens.map(p => `
    <tr>
      <td>${esc(rotuloCompetencia(p.periodoOrigem))}</td>
      <td><strong>${esc(p.nome || '—')}</strong></td>
      <td>${esc(p.linha || '—')}</td>
      <td>${esc(p.codCdc)} — ${esc(p.cdc)}</td>
      <td>${esc(p.serie || '—')}</td>
      <td class="num">${fmt(p.valorMensal)}</td>
      <td>${p.parcelaAtual || '—'} / ${p.numParcelas || '—'}</td>
      <td><span class="tag ${p.status.toLowerCase()}">${esc(p.status || 'VERIFICAR')}</span></td>
      <td><span class="tag ${p.termo === 'SIM' ? 'termo-sim' : 'termo-pendente'}">${esc(p.termo || 'PENDENTE')}</span></td>
    </tr>`).join('') || '<tr><td colspan="9" class="vazio">Nenhum parcelamento encontrado</td></tr>';
}

function filtrarParcelamentosPorStatus(status) {
  document.getElementById('filtroStatusParcela').value = status;
  atualizarParcelamentos();
  document.getElementById('tabelaParcelamentos').closest('.tabela-container')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limparFiltrosParcelamentos() {
  document.getElementById('filtroStatusParcela').value = 'TODOS';
  document.getElementById('filtroTermoParcela').value = 'TODOS';
  document.getElementById('filtroCdcParcela').value = 'TODOS';
  document.getElementById('buscaParcelamentos').value = '';
  atualizarParcelamentos();
}

// ──────────────────────────────────────────
//  Orquestrador
// ──────────────────────────────────────────
function atualizarTudo() {
  const itens = obterFiltrados();
  renderizarResumoFinanceiro();
  renderizarTotalizador(itens);
  renderizarCards(itens);
  renderizarGraficos(itens);
  renderizarResumoCdc(itens);
  atualizarDetalhe();
}

function mostrarSecao(secao) {
  const aparelhos = secao === 'aparelhos';
  const parcelamentos = secao === 'parcelamentos';
  document.getElementById('secaoLinhas').hidden = aparelhos || parcelamentos;
  document.getElementById('abaAparelhos').hidden = !aparelhos;
  document.getElementById('abaParcelamentos').hidden = !parcelamentos;
  document.getElementById('btnLinhas').classList.toggle('active', secao === 'linhas');
  document.getElementById('btnAparelhos').classList.toggle('active', aparelhos);
  document.getElementById('btnParcelamentos').classList.toggle('active', parcelamentos);
  if (aparelhos) atualizarAparelhos();
  if (parcelamentos) atualizarParcelamentos();
}

function trocarAba(evt, id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (evt?.currentTarget) evt.currentTarget.classList.add('active');
  document.getElementById(id)?.classList.add('active');
}

window.addEventListener('DOMContentLoaded', init);
