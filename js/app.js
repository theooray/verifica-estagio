(function () {
  'use strict';

  const { INSTITUICOES, CRITERIOS, DEMO } = window.DADOS;
  const V = window.Verificador;
  const $ = (sel) => document.querySelector(sel);

  const TAMANHO_MAX = 10 * 1024 * 1024;
  const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICONE_ERRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const ICONE_ALERTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  const ICONE_REQ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  const estado = { arquivo: null, texto: '', pdf: null, pagina: 1, carregando: false, resultado: null, filtro: 'todos' };

  const escapar = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatarBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1).replace('.', ',') + ' KB' : (b / 1048576).toFixed(2).replace('.', ',') + ' MB';
  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  function toast(msg, erro) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('is-error', !!erro);
    el.classList.add('is-visible');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* ---------- Formulário ---------- */

  const campos = {
    nome: $('#nome'), cpf: $('#cpf'), cidade: $('#cidade'),
    instituicao: $('#instituicao'), outraInstituicao: $('#outraInstituicao')
  };
  const tocados = new Set();

  function popularInstituicoes() {
    Object.entries(INSTITUICOES).forEach(([id, inst]) => {
      const op = document.createElement('option');
      op.value = id;
      op.textContent = inst.nome;
      campos.instituicao.appendChild(op);
    });
    $('#lista-criterios').innerHTML = CRITERIOS.map((c, i) => `<li><span>${i + 1}</span>${escapar(c)}</li>`).join('');
  }

  function renderizarCardInstituicao() {
    const id = campos.instituicao.value;
    const card = $('#card-instituicao');
    $('#campo-outra').classList.toggle('is-hidden', id !== 'outra');
    if (!id) { card.classList.add('is-hidden'); return; }
    const inst = INSTITUICOES[id];
    const nomeOutra = campos.outraInstituicao.value.trim();
    card.innerHTML = `
      <div class="inst-card__head">
        <div class="inst-card__logo" style="background:${inst.cor}">${escapar(inst.sigla.slice(0, 4))}</div>
        <div><strong>${escapar(inst.generica && nomeOutra ? nomeOutra : inst.nome)}</strong><span>${escapar(inst.local)}</span></div>
      </div>
      <dl class="inst-card__meta">
        <div><dt>Setor responsável</dt><dd>${escapar(inst.setor)}</dd></div>
        <div><dt>Prazo de análise</dt><dd>${escapar(inst.prazo)}</dd></div>
        <div><dt>Vias do termo</dt><dd>${escapar(inst.vias)}</dd></div>
      </dl>
      <h4>Requisitos do contrato</h4>
      <ul>${inst.requisitos.map(r => `<li>${ICONE_REQ}<span>${escapar(r)}</span></li>`).join('')}</ul>
      <p class="inst-card__nota">${escapar(inst.nota)}</p>`;
    card.classList.remove('is-hidden');
  }

  function validarCampos() {
    const erros = {};
    if (!campos.nome.value.trim()) erros.nome = 'Informe o nome completo.';
    else if (campos.nome.value.trim().split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.';
    const cpf = campos.cpf.value.trim();
    if (!cpf) erros.cpf = 'Informe o CPF.';
    else if (!V.cpfValido(cpf)) erros.cpf = V.soDigitos(cpf).length < 11 ? 'CPF incompleto.' : 'CPF inválido.';
    if (!campos.cidade.value.trim()) erros.cidade = 'Informe a cidade.';
    if (!campos.instituicao.value) erros.instituicao = 'Selecione a instituição.';
    else if (campos.instituicao.value === 'outra' && !campos.outraInstituicao.value.trim()) erros.instituicao = 'Informe o nome da instituição.';
    return erros;
  }

  function atualizarEstado() {
    const erros = validarCampos();
    ['nome', 'cpf', 'cidade', 'instituicao'].forEach(k => {
      const campo = campos[k].closest('.field');
      const mostrar = tocados.has(k) && erros[k];
      campo.classList.toggle('has-error', !!mostrar);
      campo.querySelector('.field__error').textContent = mostrar ? erros[k] : '';
    });
    campos.cpf.closest('.field').classList.toggle('is-valid', !erros.cpf && V.cpfValido(campos.cpf.value));

    const faltas = [];
    if (erros.nome) faltas.push('nome');
    if (erros.cidade) faltas.push('cidade');
    if (erros.instituicao) faltas.push('instituição');
    if (erros.cpf) faltas.push(campos.cpf.value.trim() ? 'CPF válido' : 'CPF');
    if (!estado.arquivo) faltas.push('contrato anexado');
    const pronto = faltas.length === 0 && !estado.carregando;
    $('#btn-enviar').disabled = !pronto;
    const hint = $('#pendencias-envio');
    hint.classList.toggle('is-ready', pronto);
    hint.textContent = estado.carregando ? 'Lendo o arquivo…'
      : pronto ? 'Tudo pronto para a verificação.' : 'Para enviar, falta: ' + faltas.join(', ') + '.';

    const passo1 = !erros.nome && !erros.cidade && !erros.instituicao && !erros.cpf;
    marcarPasso(passo1 ? (estado.arquivo ? 3 : 2) : 1);
  }

  function marcarPasso(ativo) {
    document.querySelectorAll('.stepper__item').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-active', n === ativo);
      li.classList.toggle('is-done', n < ativo);
    });
  }

  function ligarFormulario() {
    campos.cpf.addEventListener('input', () => { campos.cpf.value = V.mascaraCpf(campos.cpf.value); });
    Object.entries(campos).forEach(([k, el]) => {
      el.addEventListener('input', atualizarEstado);
      el.addEventListener('blur', () => { tocados.add(k === 'outraInstituicao' ? 'instituicao' : k); atualizarEstado(); });
    });
    campos.instituicao.addEventListener('change', () => { tocados.add('instituicao'); renderizarCardInstituicao(); atualizarEstado(); });
    campos.outraInstituicao.addEventListener('input', renderizarCardInstituicao);

    $('#btn-demo').addEventListener('click', () => {
      campos.nome.value = DEMO.nome;
      campos.cpf.value = DEMO.cpf;
      campos.cidade.value = DEMO.cidade;
      campos.instituicao.value = DEMO.instituicao;
      ['nome', 'cpf', 'cidade', 'instituicao'].forEach(k => tocados.add(k));
      renderizarCardInstituicao();
      atualizarEstado();
      toast('Dados de demonstração preenchidos. Agora anexe o contrato de exemplo.');
    });
  }

  /* ---------- Anexo ---------- */

  function tipoArquivo(file) {
    const nome = file.name.toLowerCase();
    if (nome.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
    if (nome.endsWith('.docx') || file.type.includes('wordprocessingml')) return 'docx';
    return null;
  }

  async function receberArquivo(file) {
    const tipo = tipoArquivo(file);
    if (!tipo) return toast('Formato não suportado. Envie um arquivo PDF ou DOCX.', true);
    if (file.size > TAMANHO_MAX) return toast('O arquivo excede o limite de 10 MB.', true);

    estado.arquivo = { file, tipo };
    estado.texto = '';
    estado.pdf = null;
    estado.pagina = 1;
    estado.carregando = true;

    $('#dropzone').classList.add('is-hidden');
    $('#arquivo').classList.remove('is-hidden');
    $('#arquivo-nome').textContent = file.name;
    $('#arquivo-tipo').textContent = tipo.toUpperCase();
    $('#arquivo-tipo').classList.toggle('is-docx', tipo === 'docx');
    $('#arquivo-detalhes').textContent = formatarBytes(file.size);
    $('#preview-loading').classList.remove('is-hidden');
    $('#preview-canvas').classList.toggle('is-hidden', tipo !== 'pdf');
    $('#preview-docx').classList.toggle('is-hidden', tipo !== 'docx');
    $('#preview-nav').classList.toggle('is-hidden', tipo !== 'pdf');
    atualizarEstado();

    try {
      const buffer = await file.arrayBuffer();
      if (tipo === 'pdf') await carregarPdf(buffer);
      else await carregarDocx(buffer);
      $('#arquivo-detalhes').textContent = formatarBytes(file.size) +
        (estado.pdf ? ` · ${estado.pdf.numPages} ${estado.pdf.numPages === 1 ? 'página' : 'páginas'}` : '') + ' · pronto para verificação';
    } catch (err) {
      console.error(err);
      toast('Não foi possível ler o arquivo. Verifique se ele não está corrompido.', true);
      removerArquivo();
      return;
    } finally {
      estado.carregando = false;
      $('#preview-loading').classList.add('is-hidden');
    }
    atualizarEstado();
  }

  async function carregarPdf(buffer) {
    if (!window.pdfjsLib) throw new Error('pdf.js não carregou');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let texto = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const pagina = await pdf.getPage(p);
      const conteudo = await pagina.getTextContent();
      let ultimoY = null;
      conteudo.items.forEach(it => {
        if (typeof it.str !== 'string') return;
        const y = Math.round(it.transform[5]);
        if (ultimoY !== null && Math.abs(y - ultimoY) > 2) texto += '\n';
        texto += it.str;
        ultimoY = y;
      });
      texto += '\n\n';
    }
    estado.pdf = pdf;
    estado.texto = texto;
    await renderizarPagina();
  }

  async function renderizarPagina() {
    const pdf = estado.pdf;
    if (!pdf) return;
    const pagina = await pdf.getPage(estado.pagina);
    const escala = 1.4;
    const viewport = pagina.getViewport({ scale: escala * (window.devicePixelRatio || 1) });
    const canvas = $('#preview-canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (viewport.width / (window.devicePixelRatio || 1)) + 'px';
    await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    $('#pag-indicador').textContent = `${estado.pagina} / ${pdf.numPages}`;
    $('#pag-anterior').disabled = estado.pagina <= 1;
    $('#pag-proxima').disabled = estado.pagina >= pdf.numPages;
  }

  async function carregarDocx(buffer) {
    if (!window.mammoth) throw new Error('mammoth não carregou');
    const [html, bruto] = await Promise.all([
      mammoth.convertToHtml({ arrayBuffer: buffer }),
      mammoth.extractRawText({ arrayBuffer: buffer })
    ]);
    $('#preview-docx').innerHTML = html.value || '<p><em>Documento sem texto.</em></p>';
    estado.texto = bruto.value;
  }

  function removerArquivo() {
    estado.arquivo = null;
    estado.texto = '';
    estado.pdf = null;
    $('#input-arquivo').value = '';
    $('#arquivo').classList.add('is-hidden');
    $('#dropzone').classList.remove('is-hidden');
    $('#preview-docx').innerHTML = '';
    atualizarEstado();
  }

  function ligarAnexo() {
    const dz = $('#dropzone');
    const input = $('#input-arquivo');
    const abrir = () => input.click();
    dz.addEventListener('click', abrir);
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    $('#btn-anexar').addEventListener('click', e => { e.stopPropagation(); abrir(); });
    input.addEventListener('change', () => { if (input.files[0]) receberArquivo(input.files[0]); });

    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-dragover'); }));
    dz.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) receberArquivo(f); });
    // Evita que o navegador abra o arquivo ao soltar fora da área
    ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => e.preventDefault()));

    $('#btn-remover').addEventListener('click', removerArquivo);
    $('#pag-anterior').addEventListener('click', () => { if (estado.pagina > 1) { estado.pagina--; renderizarPagina(); } });
    $('#pag-proxima').addEventListener('click', () => { if (estado.pdf && estado.pagina < estado.pdf.numPages) { estado.pagina++; renderizarPagina(); } });
  }

  /* ---------- Análise ---------- */

  function mostrarTela(id) {
    ['#tela-formulario', '#tela-analise', '#tela-relatorio'].forEach(t => $(t).classList.toggle('is-hidden', t !== id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function dadosFormulario() {
    return {
      nome: campos.nome.value.trim(),
      cpf: campos.cpf.value.trim(),
      cidade: campos.cidade.value.trim(),
      instituicao: campos.instituicao.value,
      outraInstituicao: campos.outraInstituicao.value.trim()
    };
  }

  async function enviar() {
    const dados = dadosFormulario();
    const etapas = ['Extraindo o texto do documento', 'Identificando as partes do contrato', 'Conferindo datas, jornada e valores', 'Verificando seguro e assinaturas', 'Gerando relatório'];
    $('#analise-arquivo').textContent = estado.arquivo.file.name;
    $('#analise-etapas').innerHTML = etapas.map(e => `<li><span class="dot"></span>${e}</li>`).join('');
    $('#progress-bar').style.width = '0';
    mostrarTela('#tela-analise');
    marcarPasso(3);

    const lis = document.querySelectorAll('#analise-etapas li');
    for (let i = 0; i < lis.length; i++) {
      lis[i].classList.add('is-running');
      await espera(550 + Math.random() * 300);
      lis[i].classList.remove('is-running');
      lis[i].classList.add('is-done');
      lis[i].querySelector('.dot').innerHTML = ICONE_OK;
      $('#progress-bar').style.width = ((i + 1) / lis.length * 100) + '%';
    }
    await espera(250);

    estado.resultado = Object.assign(V.verificar(estado.texto, dados), {
      dados, arquivo: estado.arquivo.file.name, tamanho: estado.arquivo.file.size, data: new Date()
    });
    estado.filtro = 'todos';
    renderizarRelatorio();
    mostrarTela('#tela-relatorio');
    document.querySelectorAll('.stepper__item').forEach(li => { li.classList.add('is-done'); li.classList.remove('is-active'); });
  }

  /* ---------- Relatório ---------- */

  const STATUS = {
    aprovado: { titulo: 'Aprovado', texto: 'O contrato atende a todos os requisitos verificados e pode seguir para homologação.', icone: ICONE_OK },
    pendencias: { titulo: 'Com pendências', texto: 'O contrato tem pendências não críticas. Corrija os itens destacados antes da homologação.', icone: ICONE_ALERTA },
    reprovado: { titulo: 'Reprovado', texto: 'O contrato apresenta problemas críticos e precisa ser corrigido e reenviado.', icone: ICONE_ERRO }
  };

  function nomeInstituicao(d) {
    const inst = INSTITUICOES[d.instituicao];
    return inst.generica ? d.outraInstituicao : inst.nome;
  }

  function renderizarRelatorio() {
    const r = estado.resultado;
    const st = STATUS[r.status];
    const erros = r.total - r.acertos;
    const dataFmt = r.data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const filtrados = r.itens.filter(i => estado.filtro === 'todos' || (estado.filtro === 'ok' ? i.ok : !i.ok));

    $('#relatorio').innerHTML = `
      <div class="rel-head">
        <div>
          <h1>Relatório de verificação</h1>
          <p>${escapar(r.arquivo)} · analisado em ${dataFmt}</p>
        </div>
        <div class="rel-actions">
          <button type="button" class="btn btn--secondary" id="btn-nova">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            Nova verificação
          </button>
          <button type="button" class="btn btn--primary" id="btn-baixar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>
            Baixar relatório
          </button>
        </div>
      </div>

      ${r.semTexto ? `<div class="card" style="margin-bottom:20px;border-color:var(--warn-100);background:var(--warn-50)">Não foi possível extrair texto do arquivo (pode ser um documento digitalizado). Os itens abaixo foram marcados como não encontrados.</div>` : ''}

      <div class="status status--${r.status}">
        <div class="status__icon">${st.icone}</div>
        <div>
          <div class="status__label">Status geral</div>
          <div class="status__title">${st.titulo}</div>
          <p class="status__text">${st.texto}</p>
        </div>
        <div class="status__score">
          <strong>${r.acertos}/${r.total}</strong>
          <span>itens corretos</span>
          <div class="meter">
            ${r.itens.map(i => `<span class="${i.ok ? 'm-ok' : 'm-err'}" style="flex:1"></span>`).join('')}
          </div>
        </div>
      </div>

      <div class="rel-grid">
        <div class="card">
          <div class="card__head">
            <h2>Checklist do contrato</h2>
            <div class="filters" role="tablist">
              <button class="chip ${estado.filtro === 'todos' ? 'is-active' : ''}" data-filtro="todos">Todos <b>${r.total}</b></button>
              <button class="chip ${estado.filtro === 'ok' ? 'is-active' : ''}" data-filtro="ok">Corretos <b>${r.acertos}</b></button>
              <button class="chip ${estado.filtro === 'erro' ? 'is-active' : ''}" data-filtro="erro">Incorretos <b>${erros}</b></button>
            </div>
          </div>
          <ul class="items">
            ${filtrados.map((i, k) => `
              <li class="item ${i.ok ? 'item--ok' : 'item--err'}" style="animation-delay:${k * 40}ms">
                <div class="item__icon">${i.ok ? ICONE_OK : ICONE_ERRO}</div>
                <div class="item__body">
                  <div class="item__title">${escapar(i.titulo)}
                    <span class="item__tag">${i.ok ? 'Correto' : 'Incorreto'}</span>
                    ${!i.ok && i.critico ? '<span class="item__tag item__tag--crit">Crítico</span>' : ''}
                  </div>
                  <p class="item__detail">${escapar(i.detalhe)}</p>
                  ${i.encontrado.length ? `<div class="item__found">${i.encontrado.map(([k, v]) => `<span>${escapar(k)}: <b>${escapar(v)}</b></span>`).join('')}</div>` : ''}
                </div>
              </li>`).join('') || '<li class="hint">Nenhum item nesta categoria.</li>'}
          </ul>
        </div>

        <aside class="card summary">
          <h3>Dados informados</h3>
          <dl>
            <div><dt>Estagiário(a)</dt><dd>${escapar(r.dados.nome)}</dd></div>
            <div><dt>CPF</dt><dd>${escapar(r.dados.cpf || 'Não informado')}</dd></div>
            <div><dt>Cidade</dt><dd>${escapar(r.dados.cidade)}</dd></div>
            <div><dt>Instituição</dt><dd>${escapar(nomeInstituicao(r.dados))}</dd></div>
            <div><dt>Arquivo</dt><dd>${escapar(r.arquivo)} (${formatarBytes(r.tamanho)})</dd></div>
          </dl>
          <hr>
          <h3>Próximos passos</h3>
          <ol class="next-steps">
            ${erros ? `<li>Corrija os ${erros} ${erros === 1 ? 'item incorreto' : 'itens incorretos'} no contrato.</li>
            <li>Colete novamente as assinaturas, se necessário.</li>
            <li>Reenvie o contrato para nova verificação.</li>`
            : `<li>Encaminhe o termo ao setor de estágios.</li><li>Guarde uma via assinada.</li>`}
          </ol>
        </aside>
      </div>`;

    $('#btn-nova').addEventListener('click', novaVerificacao);
    $('#btn-baixar').addEventListener('click', baixarRelatorio);
    document.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
      estado.filtro = b.dataset.filtro;
      renderizarRelatorio();
    }));
  }

  function novaVerificacao() {
    removerArquivo();
    mostrarTela('#tela-formulario');
    atualizarEstado();
  }

  function baixarRelatorio() {
    const r = estado.resultado;
    if (!window.jspdf) return toast('Biblioteca de PDF indisponível. Verifique sua conexão.', true);
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48;
    const txt = (s) => String(s).replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[✓✗]/g, '');
    let y = 0;

    const cores = { aprovado: [22, 163, 74], pendencias: [217, 119, 6], reprovado: [220, 38, 38] };
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('Relatório de verificação de contrato de estágio', M, 40);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(txt(`VerificaEstágio · gerado em ${r.data.toLocaleString('pt-BR')}`), M, 57);
    y = 100;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    const linhas = [
      ['Estagiário(a)', r.dados.nome], ['CPF', r.dados.cpf || 'Não informado'], ['Cidade', r.dados.cidade],
      ['Instituição', nomeInstituicao(r.dados)], ['Arquivo', r.arquivo]
    ];
    linhas.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold'); doc.text(txt(k + ':'), M, y);
      doc.setFont('helvetica', 'normal'); doc.text(txt(v), M + 90, y);
      y += 15;
    });

    y += 10;
    const cor = cores[r.status];
    doc.setFillColor(...cor);
    doc.roundedRect(M, y, W - 2 * M, 44, 6, 6, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text(txt(`Status geral: ${STATUS[r.status].titulo}`), M + 16, y + 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(txt(STATUS[r.status].texto), M + 16, y + 35);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text(`${r.acertos}/${r.total}`, W - M - 16, y + 27, { align: 'right' });
    y += 70;

    doc.setTextColor(15, 23, 42); doc.setFontSize(12);
    doc.text('Checklist', M, y);
    y += 16;

    r.itens.forEach((i, k) => {
      const detalhe = doc.splitTextToSize(txt(i.detalhe), W - 2 * M - 34);
      const achados = i.encontrado.length ? doc.splitTextToSize(txt('Encontrado: ' + i.encontrado.map(([a, b]) => `${a}: ${b}`).join(' | ')), W - 2 * M - 34) : [];
      const altura = 18 + detalhe.length * 12 + achados.length * 11 + 10;
      if (y + altura > H - 50) { doc.addPage(); y = 50; }
      const c = i.ok ? [22, 163, 74] : [220, 38, 38];
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(i.ok ? 240 : 254, i.ok ? 253 : 242, i.ok ? 244 : 242);
      doc.roundedRect(M, y, W - 2 * M, altura, 4, 4, 'FD');
      doc.setFillColor(...c);
      doc.circle(M + 14, y + 14, 6, 'F');
      doc.setDrawColor(255); doc.setLineWidth(1.4);
      if (i.ok) { doc.line(M + 11, y + 14, M + 13.5, y + 16.5); doc.line(M + 13.5, y + 16.5, M + 17.5, y + 11.5); }
      else { doc.line(M + 11.5, y + 11.5, M + 16.5, y + 16.5); doc.line(M + 16.5, y + 11.5, M + 11.5, y + 16.5); }
      doc.setLineWidth(0.5);
      doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
      doc.text(txt(`${k + 1}. ${i.titulo}`), M + 28, y + 17);
      doc.setTextColor(...c); doc.setFontSize(9);
      doc.text(i.ok ? 'CORRETO' : (i.critico ? 'INCORRETO · CRÍTICO' : 'INCORRETO'), W - M - 10, y + 17, { align: 'right' });
      doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      doc.text(detalhe, M + 28, y + 31);
      if (achados.length) {
        doc.setTextColor(100, 116, 139); doc.setFontSize(8.5);
        doc.text(achados, M + 28, y + 31 + detalhe.length * 12);
      }
      y += altura + 8;
    });

    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text('Relatório gerado automaticamente por protótipo - não substitui a análise do setor de estágios.', M, H - 24);
      doc.text(`Página ${p} de ${paginas}`, W - M, H - 24, { align: 'right' });
    }

    const base = V.normalizar(r.dados.nome).replace(/[^a-z0-9]+/g, '-');
    doc.save(`relatorio-verificacao-${base}.pdf`);
    toast('Relatório baixado.');
  }

  /* ---------- Inicialização ---------- */

  popularInstituicoes();
  ligarFormulario();
  ligarAnexo();
  $('#btn-enviar').addEventListener('click', () => { if (!$('#btn-enviar').disabled) enviar(); });
  $('#brand').addEventListener('click', e => {
    e.preventDefault();
    location.hash = '#/contratos';
    if (!$('#tela-analise').classList.contains('is-hidden')) return;
    novaVerificacao();
  });
  atualizarEstado();

  // Utilitários compartilhados com o módulo de currículos
  window.UI = { toast, escapar, formatarBytes, espera };
})();
