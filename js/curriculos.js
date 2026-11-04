/* Módulo Banco de Currículos: cadastro do candidato, gerador de currículo, publicação e busca da empresa.
   Sem back-end: os currículos publicados ficam no localStorage deste navegador. */
window.Curriculos = (function () {
  'use strict';

  const D = window.CURRICULOS_DADOS;
  const V = window.Verificador;
  const { toast, escapar, formatarBytes, espera } = window.UI;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const norm = V.normalizar;

  const CHAVE_BANCO = 'verificaestagio.curriculos.v1';
  const CHAVE_EMPRESA = 'verificaestagio.empresa.v1';
  const ANEXO_MAX = 2 * 1024 * 1024;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const FERRAMENTAS = /^(React|JavaScript|Python|Java|SQL|APIs|Git|Power BI|Excel|AutoCAD|Revit|SketchUp|Photoshop|Canva|Processo|Inglês|Lean)/;
  const DISPONIBILIDADE = {
    Matutino: 'no período da tarde', Vespertino: 'no período da manhã',
    Noturno: 'nos períodos da manhã ou da tarde', Integral: 'em meio período, conforme a grade do curso'
  };
  const ROTULOS = { nome: 'nome', cpf: 'CPF', nascimento: 'nascimento', email: 'e-mail', cidade: 'cidade', uf: 'estado', curso: 'curso', periodo: 'período', turno: 'turno' };

  const ICONE = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    local: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    bolo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
    anexo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    baixar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>'
  };

  const armazenamento = {
    ler(chave, padrao) { try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } },
    gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; } }
  };

  const est = {
    tela: 'cadastro',
    exps: [],
    proxId: 1,
    anexo: null,
    tocados: new Set(),
    registro: null,
    editando: false,
    alteradoAposPublicar: false,
    empresa: armazenamento.ler(CHAVE_EMPRESA, null),
    publicados: armazenamento.ler(CHAVE_BANCO, [])
  };

  /* ---------- Utilitários ---------- */

  const capitalizar = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const minuscula = (s) => FERRAMENTAS.test(s) || /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
  const listar = (itens) => itens.length <= 1 ? (itens[0] || '') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  const mesAtual = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`; };
  const mesAno = (v) => { const [a, m] = v.split('-').map(Number); return `${MESES[m - 1]}/${a}`; };
  const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR');
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function iniciais(nome) {
    const partes = nome.trim().split(/\s+/);
    return ((partes[0] || '')[0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  function corAvatar(texto) {
    let h = 0;
    for (const c of texto) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 32% 36%)`;
  }

  function idade(nasc) {
    const [a, m, d] = nasc.split('-').map(Number);
    const h = new Date();
    let i = h.getFullYear() - a;
    if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) i--;
    return i;
  }

  function duracao(inicio, fim) {
    const [a1, m1] = inicio.split('-').map(Number);
    const [a2, m2] = (fim || mesAtual()).split('-').map(Number);
    const meses = Math.max(1, (a2 - a1) * 12 + (m2 - m1) + 1);
    const anos = Math.floor(meses / 12), resto = meses % 12;
    return [anos && `${anos} ${anos > 1 ? 'anos' : 'ano'}`, resto && `${resto} ${resto > 1 ? 'meses' : 'mês'}`].filter(Boolean).join(' e ');
  }

  /* ---------- Gerador de currículo ---------- */

  function perfilCurso(curso) {
    const chave = Object.keys(D.CURSOS).find(c => norm(c) === norm(curso));
    return chave ? D.CURSOS[chave] : Object.assign({ area: curso.toLowerCase() }, D.CURSO_PADRAO);
  }

  function previsaoConclusao(periodo, duracaoCurso) {
    const hoje = new Date();
    const semestres = (hoje.getMonth() < 6 ? 0 : 1) + Math.max(0, duracaoCurso - periodo);
    return `${semestres % 2 + 1}º semestre de ${hoje.getFullYear() + Math.floor(semestres / 2)}`;
  }

  function topicos(descricao) {
    return (descricao || '').split(/[;\n]+|\.\s+/)
      .map(s => s.trim().replace(/\.$/, ''))
      .filter(Boolean)
      .map(s => capitalizar(s) + '.');
  }

  function gerarCurriculo(d) {
    const perfil = perfilCurso(d.curso);
    const periodo = Number(d.periodo);
    const exps = d.experiencias.slice().sort((a, b) =>
      (b.fim || '9999-99').localeCompare(a.fim || '9999-99') || b.inicio.localeCompare(a.inicio));

    const textoExps = ' ' + norm(exps.map(e => `${e.cargo} ${e.descricao}`).join(' ')) + ' ';
    const extraidas = [...new Set(D.TERMOS.filter(([t]) => new RegExp('\\b' + t).test(textoExps)).map(([, r]) => r))];
    const habilidades = [...new Set(extraidas.concat(perfil.habilidades, ['Comunicação', 'Trabalho em equipe']))].slice(0, 10);

    let fraseExp;
    if (exps.length) {
      const funcoes = exps.slice(0, 2).map(e => `${minuscula(e.cargo)} (${e.empresa})`);
      const pratica = extraidas.slice(0, 3).map(minuscula);
      fraseExp = `Possui experiência como ${listar(funcoes)}${pratica.length ? `, com prática em ${listar(pratica)}` : ''}.`;
    } else {
      fraseExp = `Busca a primeira oportunidade de estágio para aplicar na prática os conhecimentos do curso, com destaque para ${listar(perfil.habilidades.slice(0, 2).map(minuscula))}.`;
    }

    return {
      titulo: `Estudante de ${d.curso} · ${periodo}º período`,
      resumo: `Estudante do ${periodo}º período de ${d.curso}, com interesse em atuar na área de ${perfil.area}. ${fraseExp} ` +
        `Pessoa proativa, organizada e comprometida com o aprendizado contínuo, com disponibilidade para estágio ${DISPONIBILIDADE[d.turno] || 'em meio período'}.`,
      objetivo: `Estágio na área de ${perfil.area}, com jornada de até 6 horas diárias, para contribuir com a equipe e desenvolver competências profissionais alinhadas à formação em ${d.curso}.`,
      formacao: [{
        titulo: d.curso,
        detalhe: `Graduação · ${periodo}º período (em andamento) · Turno ${d.turno.toLowerCase()}`,
        extra: `Previsão de conclusão: ${previsaoConclusao(periodo, perfil.duracao)}`
      }],
      experiencias: exps.map(e => ({
        cargo: e.cargo,
        empresa: e.empresa,
        periodo: `${mesAno(e.inicio)} – ${e.fim ? mesAno(e.fim) : 'atual'} · ${duracao(e.inicio, e.fim)}`,
        topicos: topicos(e.descricao)
      })),
      habilidades,
      contato: { email: d.email, local: `${d.cidade} – ${d.uf}`, idade: `${idade(d.nascimento)} anos` }
    };
  }

  /* ---------- Banco ---------- */

  const sementes = D.SEMENTES.map((s, i) => ({
    id: 'exemplo-' + (i + 1), origem: 'exemplo', publicadoEm: s.publicadoEm + 'T12:00:00',
    dados: s, cv: gerarCurriculo(s), anexo: null
  }));

  const banco = () => est.publicados.concat(sementes).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));

  /* ---------- Cadastro ---------- */

  const campos = {};
  $$('#cv-form [data-campo]').forEach(el => { campos[el.dataset.campo] = el; });

  function popularListas() {
    campos.uf.insertAdjacentHTML('beforeend', D.UFS.map(([s, n]) => `<option value="${s}">${s} – ${n}</option>`).join(''));
    campos.periodo.insertAdjacentHTML('beforeend', Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}º período</option>`).join(''));
    campos.turno.insertAdjacentHTML('beforeend', D.TURNOS.map(t => `<option>${t}</option>`).join(''));
    $('#lista-cursos').innerHTML = Object.keys(D.CURSOS).map(c => `<option value="${c}">`).join('');
    campos.nascimento.max = new Date().toISOString().slice(0, 10);
  }

  function lerDados() {
    const d = {};
    Object.entries(campos).forEach(([k, el]) => { d[k] = el.value.trim(); });
    d.experiencias = est.exps.map(({ cargo, empresa, inicio, fim, descricao }) =>
      ({ cargo: cargo.trim(), empresa: empresa.trim(), inicio, fim, descricao: descricao.trim() }));
    return d;
  }

  function validar() {
    const d = lerDados();
    const e = {};
    if (!d.nome) e.nome = 'Informe o nome completo.';
    else if (d.nome.split(/\s+/).length < 2) e.nome = 'Informe nome e sobrenome.';
    if (!d.cpf) e.cpf = 'Informe o CPF.';
    else if (!V.cpfValido(d.cpf)) e.cpf = V.soDigitos(d.cpf).length < 11 ? 'CPF incompleto.' : 'CPF inválido.';
    if (!d.nascimento) e.nascimento = 'Informe a data de nascimento.';
    else { const i = idade(d.nascimento); if (isNaN(i) || i < 14 || i > 80) e.nascimento = 'Data de nascimento inválida.'; }
    if (!d.email) e.email = 'Informe o e-mail.';
    else if (!emailValido(d.email)) e.email = 'E-mail inválido.';
    if (!d.cidade) e.cidade = 'Informe a cidade.';
    if (!d.uf) e.uf = 'Selecione o estado.';
    if (!d.curso) e.curso = 'Informe o curso.';
    if (!d.periodo) e.periodo = 'Selecione o período.';
    if (!d.turno) e.turno = 'Selecione o turno.';

    const errosExp = {};
    est.exps.forEach(x => {
      const er = {};
      if (!x.cargo.trim()) er.cargo = 'Informe o cargo ou atividade.';
      if (!x.empresa.trim()) er.empresa = 'Informe a empresa ou local.';
      if (!x.inicio) er.inicio = 'Informe o início.';
      else if (x.inicio > mesAtual()) er.inicio = 'O início não pode ser no futuro.';
      if (x.fim && x.inicio && x.fim < x.inicio) er.fim = 'O término é anterior ao início.';
      if (Object.keys(er).length) errosExp[x.id] = er;
    });
    return { d, e, errosExp };
  }

  function mostrarErro(input, msg) {
    const campo = input.closest('.field');
    campo.classList.toggle('has-error', !!msg);
    campo.querySelector('.field__error').textContent = msg || '';
  }

  function atualizar() {
    const { e, errosExp } = validar();
    Object.entries(campos).forEach(([k, el]) => mostrarErro(el, est.tocados.has(k) ? e[k] : ''));
    campos.cpf.closest('.field').classList.toggle('is-valid', !e.cpf);
    $$('#cv-experiencias [data-exp]').forEach(el => {
      const id = Number(el.closest('.exp').dataset.id);
      const campo = el.dataset.exp;
      mostrarErro(el, est.tocados.has(`exp-${id}-${campo}`) ? (errosExp[id] || {})[campo] : '');
    });

    const faltas = Object.keys(e).map(k => ROTULOS[k]);
    if (Object.keys(errosExp).length) faltas.push('dados das experiências');
    const pronto = faltas.length === 0;
    $('#cv-gerar').disabled = !pronto;
    const hint = $('#cv-pendencias');
    hint.classList.toggle('is-ready', pronto);
    hint.textContent = pronto ? 'Tudo pronto para gerar o seu currículo.' : 'Para gerar, falta: ' + faltas.join(', ') + '.';
  }

  function renderExps() {
    const max = mesAtual();
    $('#cv-experiencias').innerHTML = est.exps.map((x, i) => `
      <div class="exp" data-id="${x.id}">
        <div class="exp__head">
          <span class="exp__num">Experiência ${i + 1}</span>
          <button type="button" class="btn btn--ghost btn--danger btn--sm" data-remover="${x.id}">${ICONE.lixo} Remover</button>
        </div>
        <div class="grid">
          <div class="field">
            <label for="exp-${x.id}-cargo">Cargo / atividade *</label>
            <input id="exp-${x.id}-cargo" data-exp="cargo" type="text" value="${escapar(x.cargo)}" placeholder="Ex.: Assistente administrativo">
            <small class="field__error"></small>
          </div>
          <div class="field">
            <label for="exp-${x.id}-empresa">Empresa ou local *</label>
            <input id="exp-${x.id}-empresa" data-exp="empresa" type="text" value="${escapar(x.empresa)}" placeholder="Ex.: Supermercado Central">
            <small class="field__error"></small>
          </div>
          <div class="field">
            <label for="exp-${x.id}-inicio">Início *</label>
            <input id="exp-${x.id}-inicio" data-exp="inicio" type="month" value="${x.inicio}" max="${max}">
            <small class="field__error"></small>
          </div>
          <div class="field">
            <label for="exp-${x.id}-fim">Término <span class="optional">(deixe vazio se for o atual)</span></label>
            <input id="exp-${x.id}-fim" data-exp="fim" type="month" value="${x.fim}" max="${max}">
            <small class="field__error"></small>
          </div>
          <div class="field field--full">
            <label for="exp-${x.id}-descricao">Descrição</label>
            <textarea id="exp-${x.id}-descricao" data-exp="descricao" rows="3" placeholder="Principais atividades, separadas por ponto e vírgula. Ex.: atendimento a clientes; controle de estoque">${escapar(x.descricao)}</textarea>
            <small class="field__error"></small>
          </div>
        </div>
      </div>`).join('');
    $('#cv-exp-vazio').classList.toggle('is-hidden', est.exps.length > 0);
    atualizar();
  }

  function adicionarExp(dados) {
    const exp = Object.assign({ id: est.proxId++, cargo: '', empresa: '', inicio: '', fim: '', descricao: '' }, dados);
    est.exps.push(exp);
    return exp;
  }

  function definirAnexo(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return toast('Anexe o currículo em formato PDF.', true);
    if (file.size > ANEXO_MAX) return toast('O PDF excede o limite de 2 MB.', true);
    const leitor = new FileReader();
    leitor.onload = () => {
      est.anexo = { nome: file.name, tamanho: file.size, dataUrl: leitor.result };
      $('#cv-anexo-nome').textContent = file.name;
      $('#cv-anexo-tamanho').textContent = formatarBytes(file.size);
      $('#cv-anexo-zona').classList.add('is-hidden');
      $('#cv-anexo-arquivo').classList.remove('is-hidden');
    };
    leitor.readAsDataURL(file);
  }

  function removerAnexo() {
    est.anexo = null;
    $('#cv-anexo-input').value = '';
    $('#cv-anexo-zona').classList.remove('is-hidden');
    $('#cv-anexo-arquivo').classList.add('is-hidden');
  }

  function preencherDemo() {
    const demo = D.DEMO;
    Object.keys(campos).forEach(k => { campos[k].value = demo[k]; est.tocados.add(k); });
    est.exps = [];
    demo.experiencias.forEach(x => adicionarExp(x));
    renderExps();
    toast('Dados de exemplo preenchidos. Agora clique em "Gerar currículo com IA".');
  }

  function ligarCadastro() {
    campos.cpf.addEventListener('input', () => { campos.cpf.value = V.mascaraCpf(campos.cpf.value); });
    Object.entries(campos).forEach(([k, el]) => {
      el.addEventListener('input', atualizar);
      el.addEventListener('change', () => { est.tocados.add(k); atualizar(); });
      el.addEventListener('blur', () => { est.tocados.add(k); atualizar(); });
    });

    const lista = $('#cv-experiencias');
    lista.addEventListener('input', ev => {
      const el = ev.target.closest('[data-exp]');
      if (!el) return;
      const exp = est.exps.find(x => x.id === Number(el.closest('.exp').dataset.id));
      exp[el.dataset.exp] = el.value;
      atualizar();
    });
    lista.addEventListener('focusout', ev => {
      const el = ev.target.closest('[data-exp]');
      if (!el) return;
      est.tocados.add(`exp-${el.closest('.exp').dataset.id}-${el.dataset.exp}`);
      atualizar();
    });
    lista.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-remover]');
      if (!btn) return;
      est.exps = est.exps.filter(x => x.id !== Number(btn.dataset.remover));
      renderExps();
    });

    $('#cv-add-exp').addEventListener('click', () => {
      const exp = adicionarExp();
      renderExps();
      const input = document.getElementById(`exp-${exp.id}-cargo`);
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    });

    const zona = $('#cv-anexo-zona');
    const input = $('#cv-anexo-input');
    zona.addEventListener('click', () => input.click());
    zona.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => definirAnexo(input.files[0]));
    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('is-dragover'); }));
    zona.addEventListener('drop', e => definirAnexo(e.dataTransfer.files[0]));
    $('#cv-anexo-remover').addEventListener('click', removerAnexo);

    $('#cv-demo').addEventListener('click', preencherDemo);
    $('#cv-gerar').addEventListener('click', gerar);
  }

  /* ---------- Geração e pré-visualização ---------- */

  function mostrarTelaCandidato(tela) {
    est.tela = tela;
    if (location.hash.startsWith('#/curriculos/empresa')) return; // a empresa está aberta; mostra ao voltar
    $('#cv-tela-cadastro').classList.toggle('is-hidden', tela !== 'cadastro');
    $('#cv-tela-gerando').classList.toggle('is-hidden', tela !== 'gerando');
    $('#cv-tela-preview').classList.toggle('is-hidden', tela !== 'preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function gerar() {
    const { d, e, errosExp } = validar();
    if (Object.keys(e).length || Object.keys(errosExp).length) return;

    const etapas = ['Analisando seus dados e experiências', 'Redigindo resumo e objetivo profissional', 'Organizando formação e experiências', 'Identificando habilidades', 'Formatando o currículo'];
    $('#cv-etapas').innerHTML = etapas.map(t => `<li><span class="dot"></span>${t}</li>`).join('');
    $('#cv-progress').style.width = '0';
    mostrarTelaCandidato('gerando');
    const lis = $$('#cv-etapas li');
    for (let i = 0; i < lis.length; i++) {
      lis[i].classList.add('is-running');
      await espera(450 + Math.random() * 300);
      lis[i].classList.replace('is-running', 'is-done');
      lis[i].querySelector('.dot').innerHTML = ICONE.ok;
      $('#cv-progress').style.width = ((i + 1) / lis.length * 100) + '%';
    }
    await espera(200);

    const anterior = est.publicados.find(r => V.soDigitos(r.dados.cpf) === V.soDigitos(d.cpf));
    est.registro = {
      id: anterior ? anterior.id : 'cand-' + Date.now(),
      origem: 'usuario',
      publicadoEm: null,
      dados: d,
      cv: gerarCurriculo(d),
      anexo: est.anexo
    };
    est.editando = false;
    est.alteradoAposPublicar = false;
    renderPreview();
    mostrarTelaCandidato('preview');
  }

  function htmlCurriculo(reg) {
    const { dados, cv, anexo } = reg;
    return `
      <article class="cv-paper">
        <header class="cv-header">
          <span class="avatar avatar--lg" style="background:${corAvatar(dados.nome)}">${escapar(iniciais(dados.nome))}</span>
          <div>
            <h2 class="cv-nome">${escapar(dados.nome)}</h2>
            <p class="cv-titulo">${escapar(cv.titulo)}</p>
            <ul class="cv-contato">
              <li>${ICONE.email}${escapar(cv.contato.email)}</li>
              <li>${ICONE.local}${escapar(cv.contato.local)}</li>
              <li>${ICONE.bolo}${escapar(cv.contato.idade)}</li>
            </ul>
          </div>
        </header>
        <section class="cv-sec"><h3>Resumo profissional</h3><p>${escapar(cv.resumo)}</p></section>
        <section class="cv-sec"><h3>Objetivo</h3><p>${escapar(cv.objetivo)}</p></section>
        <section class="cv-sec"><h3>Formação acadêmica</h3>
          ${cv.formacao.map(f => `<div class="cv-item"><strong>${escapar(f.titulo)}</strong><p>${escapar(f.detalhe)}</p>${f.extra ? `<p>${escapar(f.extra)}</p>` : ''}</div>`).join('')}
        </section>
        <section class="cv-sec"><h3>Experiências</h3>
          ${cv.experiencias.length ? cv.experiencias.map(x => `
            <div class="cv-item">
              <div class="cv-item__top"><strong>${escapar(x.cargo)}</strong><span>${escapar(x.periodo)}</span></div>
              <p class="cv-item__emp">${escapar(x.empresa)}</p>
              ${x.topicos.length ? `<ul>${x.topicos.map(t => `<li>${escapar(t)}</li>`).join('')}</ul>` : ''}
            </div>`).join('') : '<p class="hint">Sem experiências profissionais informadas até o momento.</p>'}
        </section>
        <section class="cv-sec"><h3>Habilidades</h3>
          <div class="cv-skills">${cv.habilidades.map(h => `<span>${escapar(h)}</span>`).join('')}</div>
        </section>
        ${anexo ? `<p class="cv-anexo">${ICONE.anexo} Currículo próprio anexado: ${escapar(anexo.nome)}</p>` : ''}
      </article>`;
  }

  function htmlEditor(reg) {
    const { dados, cv } = reg;
    const campo = (path, valor, rotulo, multi, linhas) => `
      <label class="ed"><span>${rotulo}</span>${multi
        ? `<textarea data-ed="${path}" rows="${linhas || 4}">${escapar(valor)}</textarea>`
        : `<input type="text" data-ed="${path}" value="${escapar(valor)}">`}</label>`;
    return `
      <article class="cv-paper cv-paper--edit">
        <p class="cv-edit-note">${ICONE.editar} Modo de edição: altere os textos e clique em <strong>Concluir edição</strong>.</p>
        <header class="cv-header">
          <span class="avatar avatar--lg" style="background:${corAvatar(dados.nome)}">${escapar(iniciais(dados.nome))}</span>
          <div class="cv-header__ed"><h2 class="cv-nome">${escapar(dados.nome)}</h2>${campo('titulo', cv.titulo, 'Título')}</div>
        </header>
        <section class="cv-sec"><h3>Resumo profissional</h3>${campo('resumo', cv.resumo, 'Texto do resumo', true, 5)}</section>
        <section class="cv-sec"><h3>Objetivo</h3>${campo('objetivo', cv.objetivo, 'Texto do objetivo', true, 3)}</section>
        <section class="cv-sec"><h3>Formação acadêmica</h3>
          ${cv.formacao.map((f, i) => `<div class="ed-grupo">${campo(`formacao.${i}.titulo`, f.titulo, 'Curso')}${campo(`formacao.${i}.detalhe`, f.detalhe, 'Detalhes')}${campo(`formacao.${i}.extra`, f.extra || '', 'Informação adicional')}</div>`).join('')}
        </section>
        ${cv.experiencias.length ? `<section class="cv-sec"><h3>Experiências</h3>
          ${cv.experiencias.map((x, i) => `<div class="ed-grupo">
            <div class="ed-linha">${campo(`experiencias.${i}.cargo`, x.cargo, 'Cargo')}${campo(`experiencias.${i}.empresa`, x.empresa, 'Empresa ou local')}</div>
            ${campo(`experiencias.${i}.periodo`, x.periodo, 'Período')}
            ${campo(`experiencias.${i}.topicos`, x.topicos.join('\n'), 'Atividades (uma por linha)', true, Math.max(3, x.topicos.length))}
          </div>`).join('')}</section>` : ''}
        <section class="cv-sec"><h3>Habilidades</h3>${campo('habilidades', cv.habilidades.join(', '), 'Separe as habilidades por vírgula', true, 2)}</section>
      </article>`;
  }

  function aplicarEdicao() {
    const cv = est.registro.cv;
    $$('#cv-preview [data-ed]').forEach(el => {
      const partes = el.dataset.ed.split('.');
      const chave = partes.pop();
      const alvo = partes.reduce((o, p) => o[p], cv);
      const valor = el.value.trim();
      if (chave === 'topicos') alvo[chave] = valor.split('\n').map(s => s.trim()).filter(Boolean);
      else if (chave === 'habilidades') alvo[chave] = valor.split(',').map(s => s.trim()).filter(Boolean);
      else alvo[chave] = valor;
    });
  }

  function renderPreview() {
    $('#cv-preview').innerHTML = est.editando ? htmlEditor(est.registro) : htmlCurriculo(est.registro);
    const btn = $('#cv-editar');
    btn.innerHTML = est.editando ? `${ICONE.ok} Concluir edição` : `${ICONE.editar} Editar texto`;
    btn.classList.toggle('btn--primary', est.editando);
    btn.classList.toggle('btn--secondary', !est.editando);
    renderPublicacao();
  }

  function renderPublicacao() {
    const reg = est.registro;
    const publicado = !!reg.publicadoEm;
    $('#cv-publicacao').innerHTML = publicado ? `
      <div class="pub pub--ok">
        <span class="pub__icon">${ICONE.ok}</span>
        <div><h3>Currículo publicado</h3><p class="hint">Em ${new Date(reg.publicadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p></div>
      </div>
      <p class="hint hint--body">Empresas já podem encontrar você. Os contatos chegarão em <strong>${escapar(reg.dados.email)}</strong>.</p>
      <div class="stack">
        ${est.alteradoAposPublicar ? '<button type="button" class="btn btn--primary btn--block" data-publicar>Atualizar publicação</button>' : ''}
        <a class="btn btn--secondary btn--block" href="#/curriculos/empresa">Ver como empresa</a>
      </div>` : `
      <h3>Publicar no banco</h3>
      <p class="hint hint--body">Ao publicar, seu currículo fica visível para empresas que buscam estagiários. Os contatos chegarão em <strong>${escapar(reg.dados.email)}</strong>.</p>
      <div class="stack"><button type="button" class="btn btn--primary btn--block btn--lg" data-publicar>Publicar no banco de currículos</button></div>`;
  }

  function publicar() {
    if (est.editando) { aplicarEdicao(); est.editando = false; }
    const reg = est.registro;
    reg.publicadoEm = new Date().toISOString();
    est.publicados = est.publicados.filter(r => r.id !== reg.id && V.soDigitos(r.dados.cpf) !== V.soDigitos(reg.dados.cpf));
    est.publicados.unshift(JSON.parse(JSON.stringify(reg)));
    if (!armazenamento.gravar(CHAVE_BANCO, est.publicados)) {
      // Sem espaço para o PDF anexado: publica sem o arquivo
      if (reg.anexo) est.publicados[0].anexo = { nome: reg.anexo.nome, tamanho: reg.anexo.tamanho, dataUrl: null };
      armazenamento.gravar(CHAVE_BANCO, est.publicados);
    }
    est.alteradoAposPublicar = false;
    renderPreview();
    toast('Currículo publicado no banco de currículos!');
  }

  function ligarPreview() {
    $('#cv-voltar').addEventListener('click', () => {
      if (est.editando) { aplicarEdicao(); est.editando = false; }
      mostrarTelaCandidato('cadastro');
    });
    $('#cv-editar').addEventListener('click', () => {
      if (est.editando) {
        aplicarEdicao();
        if (est.registro.publicadoEm) est.alteradoAposPublicar = true;
        toast('Alterações aplicadas ao currículo.');
      }
      est.editando = !est.editando;
      renderPreview();
    });
    $('#cv-baixar').addEventListener('click', () => {
      if (est.editando) { aplicarEdicao(); est.editando = false; renderPreview(); }
      baixarPdf(est.registro);
    });
    $('#cv-publicacao').addEventListener('click', ev => { if (ev.target.closest('[data-publicar]')) publicar(); });
  }

  /* ---------- PDF ---------- */

  function baixarPdf(reg) {
    if (!window.jspdf) return toast('Biblioteca de PDF indisponível. Verifique sua conexão.', true);
    const { dados, cv } = reg;
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 50, LW = W - 2 * M;
    const t = (s) => String(s).replace(/[–—]/g, '-').replace(/[“”]/g, '"');
    let y;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, W, 104, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
    doc.text(t(dados.nome), M, 46);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5);
    doc.text(t(cv.titulo), M, 66);
    doc.setFontSize(9.5);
    doc.text(t([cv.contato.email, cv.contato.local, cv.contato.idade].join('    |    ')), M, 87);
    y = 136;

    const garantir = (h) => { if (y + h > H - 56) { doc.addPage(); y = 56; } };
    const secao = (titulo) => {
      garantir(44);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(37, 99, 235);
      doc.text(t(titulo.toUpperCase()), M, y);
      doc.setDrawColor(219, 234, 254); doc.setLineWidth(1);
      doc.line(M, y + 6, W - M, y + 6);
      y += 22;
    };
    const paragrafo = (texto, o = {}) => {
      doc.setFont('helvetica', o.negrito ? 'bold' : 'normal');
      doc.setFontSize(o.tam || 10);
      doc.setTextColor(...(o.cor || [30, 41, 59]));
      doc.splitTextToSize(t(texto), LW - (o.recuo || 0)).forEach(l => { garantir(14); doc.text(l, M + (o.recuo || 0), y); y += 14; });
    };

    secao('Resumo profissional'); paragrafo(cv.resumo); y += 10;
    secao('Objetivo'); paragrafo(cv.objetivo); y += 10;
    secao('Formação acadêmica');
    cv.formacao.forEach(f => {
      paragrafo(f.titulo, { negrito: true, tam: 10.5 });
      paragrafo(f.detalhe, { cor: [71, 85, 105] });
      if (f.extra) paragrafo(f.extra, { cor: [71, 85, 105] });
      y += 6;
    });
    y += 4;
    if (cv.experiencias.length) {
      secao('Experiências');
      cv.experiencias.forEach(x => {
        garantir(44);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
        const per = t(x.periodo);
        doc.text(per, W - M, y, { align: 'right' });
        const largPer = doc.getTextWidth(per);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 23, 42);
        doc.splitTextToSize(t(x.cargo), LW - largPer - 16).forEach(l => { doc.text(l, M, y); y += 14; });
        paragrafo(x.empresa, { cor: [71, 85, 105] });
        x.topicos.forEach(tp => {
          garantir(14);
          doc.setFillColor(100, 116, 139);
          doc.circle(M + 4, y - 3.5, 1.6, 'F');
          paragrafo(tp, { recuo: 12 });
        });
        y += 8;
      });
      y += 2;
    }
    secao('Habilidades');
    paragrafo(cv.habilidades.join('   ·   '));

    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text('Currículo gerado no Banco de Currículos - VerificaEstágio', M, H - 26);
      doc.text(`Página ${p} de ${paginas}`, W - M, H - 26, { align: 'right' });
    }
    doc.save(`curriculo-${slug(dados.nome)}.pdf`);
    toast('PDF do currículo baixado.');
  }

  /* ---------- Área da empresa ---------- */

  const filtros = { busca: $('#f-busca'), curso: $('#f-curso'), periodo: $('#f-periodo'), turno: $('#f-turno'), uf: $('#f-uf'), cidade: $('#f-cidade') };

  function opcoes(select, itens, rotuloTodos) {
    const atual = select.value;
    select.innerHTML = `<option value="">${rotuloTodos}</option>` + itens.map(([v, r]) => `<option value="${escapar(v)}">${escapar(r)}</option>`).join('');
    select.value = itens.some(([v]) => v === atual) ? atual : '';
  }

  function atualizarOpcoesFiltros() {
    const regs = banco();
    const unicos = (fn) => [...new Set(regs.map(fn))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const nomeUf = Object.fromEntries(D.UFS);
    opcoes(filtros.curso, unicos(r => r.dados.curso).map(c => [c, c]), 'Todos os cursos');
    opcoes(filtros.periodo, Array.from({ length: 10 }, (_, i) => [String(i + 1), `${i + 1}º período`]), 'Qualquer período');
    opcoes(filtros.turno, D.TURNOS.map(t => [t, t]), 'Todos os turnos');
    opcoes(filtros.uf, unicos(r => r.dados.uf).map(u => [u, `${u} – ${nomeUf[u] || u}`]), 'Todos os estados');
    const uf = filtros.uf.value;
    opcoes(filtros.cidade, [...new Set(regs.filter(r => !uf || r.dados.uf === uf).map(r => r.dados.cidade))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')).map(c => [c, c]), 'Todas as cidades');
  }

  function filtrar() {
    const f = Object.fromEntries(Object.entries(filtros).map(([k, el]) => [k, el.value.trim()]));
    const termo = norm(f.busca);
    return banco().filter(r => {
      const d = r.dados;
      if (f.curso && d.curso !== f.curso) return false;
      if (f.periodo && String(d.periodo) !== f.periodo) return false;
      if (f.turno && d.turno !== f.turno) return false;
      if (f.uf && d.uf !== f.uf) return false;
      if (f.cidade && d.cidade !== f.cidade) return false;
      if (termo) {
        const alvo = norm([d.nome, d.curso, r.cv.titulo, r.cv.habilidades.join(' '), r.cv.experiencias.map(x => x.cargo + ' ' + x.empresa).join(' ')].join(' '));
        if (!termo.split(' ').every(p => alvo.includes(p))) return false;
      }
      return true;
    });
  }

  function renderResultados() {
    const lista = filtrar();
    $('#cv-contagem').innerHTML = `<strong>${lista.length}</strong> ${lista.length === 1 ? 'candidato encontrado' : 'candidatos encontrados'}`;
    $('#cv-resultados').innerHTML = lista.map(r => {
      const d = r.dados;
      return `
        <button type="button" class="cand" data-abrir="${escapar(r.id)}">
          <div class="cand__top">
            <span class="avatar" style="background:${corAvatar(d.nome)}">${escapar(iniciais(d.nome))}</span>
            <div class="cand__nome"><strong>${escapar(d.nome)}</strong><span>${escapar(d.curso)}</span></div>
            ${r.origem === 'usuario' ? '<span class="badge badge--novo">Novo</span>' : ''}
          </div>
          <div class="cand__chips">
            <span>${d.periodo}º período</span>
            <span>${escapar(d.turno)}</span>
            <span>${ICONE.local}${escapar(d.cidade)} – ${escapar(d.uf)}</span>
          </div>
          <p class="cand__skills">${r.cv.habilidades.slice(0, 3).map(escapar).join(', ')}</p>
          <div class="cand__foot">
            <span>Publicado em ${dataCurta(r.publicadoEm)}</span>
            <span class="cand__link">Ver currículo</span>
          </div>
        </button>`;
    }).join('') || `
      <div class="card empty-state">
        <h3>Nenhum candidato encontrado</h3>
        <p class="hint hint--body">Tente remover alguns filtros ou buscar por outro termo.</p>
      </div>`;
  }

  function renderEmpresa() {
    const logado = !!est.empresa;
    $('#cv-login').classList.toggle('is-hidden', logado);
    $('#cv-busca').classList.toggle('is-hidden', !logado);
    if (!logado) return;
    $('#emp-rotulo').textContent = est.empresa.nome;
    $('#emp-avatar').textContent = iniciais(est.empresa.nome);
    $('#emp-avatar').style.background = corAvatar(est.empresa.nome);
    atualizarOpcoesFiltros();
    renderResultados();
  }

  function abrirModal(id) {
    const reg = banco().find(r => r.id === id);
    if (!reg) return;
    const primeiroNome = reg.dados.nome.split(' ')[0];
    const empresa = est.empresa ? est.empresa.nome : 'nossa empresa';
    const assunto = `Oportunidade de estágio - ${empresa}`;
    const corpo = `Olá, ${primeiroNome}!\n\nEncontramos seu currículo no Banco de Currículos e gostaríamos de conversar sobre uma oportunidade de estágio na ${empresa.replace(/\.$/, '')}.\n\nPodemos agendar uma conversa?\n\nAtenciosamente,\n${empresa}`;
    const mailto = `mailto:${reg.dados.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

    $('#cv-modal-titulo').textContent = `Currículo de ${reg.dados.nome}`;
    $('#cv-modal-corpo').innerHTML = htmlCurriculo(reg);
    $('#cv-modal-acoes').innerHTML = `
      ${reg.anexo && reg.anexo.dataUrl ? `<a class="btn btn--secondary" href="${reg.anexo.dataUrl}" download="${escapar(reg.anexo.nome)}">${ICONE.anexo} Currículo anexado</a>` : ''}
      <button type="button" class="btn btn--secondary" data-pdf>${ICONE.baixar} Baixar PDF</button>
      <a class="btn btn--primary" href="${escapar(mailto)}" data-contato>${ICONE.email} Entrar em contato</a>`;
    $('#cv-modal-acoes [data-pdf]').addEventListener('click', () => baixarPdf(reg));
    $('#cv-modal-acoes [data-contato]').addEventListener('click', () => toast(`Abrindo seu e-mail para contatar ${primeiroNome}…`));
    $('#cv-modal').classList.remove('is-hidden');
    document.body.classList.add('modal-aberto');
    $('#cv-modal-corpo').scrollTop = 0;
    $('#cv-modal .icon-btn').focus();
  }

  function fecharModal() {
    $('#cv-modal').classList.add('is-hidden');
    document.body.classList.remove('modal-aberto');
  }

  function ligarEmpresa() {
    $('#emp-entrar').addEventListener('click', () => {
      const nome = $('#emp-nome').value.trim();
      if (!nome) return toast('Informe o nome da empresa.', true);
      est.empresa = { nome };
      armazenamento.gravar(CHAVE_EMPRESA, est.empresa);
      renderEmpresa();
      toast(`Conectado como ${nome}`);
    });
    $('#emp-sair').addEventListener('click', () => {
      est.empresa = null;
      armazenamento.gravar(CHAVE_EMPRESA, null);
      renderEmpresa();
    });
    filtros.busca.addEventListener('input', renderResultados);
    ['curso', 'periodo', 'turno', 'cidade'].forEach(k => filtros[k].addEventListener('change', renderResultados));
    filtros.uf.addEventListener('change', () => { atualizarOpcoesFiltros(); renderResultados(); });
    $('#f-limpar').addEventListener('click', () => {
      Object.values(filtros).forEach(el => { el.value = ''; });
      atualizarOpcoesFiltros();
      renderResultados();
    });
    $('#cv-resultados').addEventListener('click', ev => {
      const card = ev.target.closest('[data-abrir]');
      if (card) abrirModal(card.dataset.abrir);
    });
    $$('#cv-modal [data-fechar]').forEach(el => el.addEventListener('click', fecharModal));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#cv-modal').classList.contains('is-hidden')) fecharModal(); });
  }

  /* ---------- Navegação interna ---------- */

  function mostrar(sub) {
    $$('.segmented__item').forEach(a => a.classList.toggle('is-active', a.dataset.sub === sub));
    const empresa = sub === 'empresa';
    $('#cv-tela-empresa').classList.toggle('is-hidden', !empresa);
    if (empresa) {
      ['#cv-tela-cadastro', '#cv-tela-gerando', '#cv-tela-preview'].forEach(s => $(s).classList.add('is-hidden'));
      renderEmpresa();
    } else {
      mostrarTelaCandidato(est.tela);
    }
  }

  popularListas();
  ligarCadastro();
  ligarPreview();
  ligarEmpresa();
  renderExps();

  return { mostrar };
})();
