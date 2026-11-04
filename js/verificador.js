/* Regras de verificação do Termo de Compromisso de Estágio.
   Tudo roda no navegador, a partir do texto extraído do PDF/DOCX. */
window.Verificador = (function () {
  'use strict';

  const LIMITE_HORAS_DIA = 6;
  const LIMITE_HORAS_SEMANA = 30;
  const LIMITE_ANOS = 2;

  const normalizar = s => (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

  const soDigitos = s => (s || '').replace(/\D/g, '');

  function cpfValido(cpf) {
    const d = soDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
    }
    return true;
  }

  function mascaraCpf(valor) {
    return soDigitos(valor).slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function parseData(str) {
    const [d, m, a] = str.split('/').map(Number);
    const data = new Date(a, m - 1, d);
    return data.getDate() === d && data.getMonth() === m - 1 ? data : null;
  }

  const limpar = s => (s || '').replace(/\s+/g, ' ').trim();

  function verificar(texto, dados) {
    const plano = limpar(texto);
    const n = normalizar(texto);
    const inst = window.DADOS.INSTITUICOES[dados.instituicao];
    const itens = [];
    const add = (item) => itens.push(Object.assign({ encontrado: [] }, item));

    // 1. Nome do estagiário
    {
      const m = plano.match(/estagi[áa]ri[oa](?:\s*\([oa]\))?\s*:\s*([A-Za-zÀ-ÖØ-öø-ÿ' ]+?)\s*[,;]/i);
      const nomeContrato = m ? limpar(m[1]) : null;
      const nomeForm = limpar(dados.nome);
      let ok, detalhe;
      if (nomeContrato) {
        ok = normalizar(nomeContrato) === normalizar(nomeForm);
        detalhe = ok
          ? `O nome no contrato confere com o cadastro.`
          : `O contrato informa “${nomeContrato}”, mas o cadastro informa “${nomeForm}”. Corrija o nome antes da assinatura.`;
      } else {
        ok = n.includes(normalizar(nomeForm));
        detalhe = ok
          ? 'O nome cadastrado foi encontrado no contrato.'
          : 'Não foi possível localizar o nome do estagiário na qualificação das partes.';
      }
      add({ id: 'nome', titulo: 'Nome do estagiário confere com o cadastro', ok, critico: true, detalhe,
        encontrado: nomeContrato ? [['No contrato', nomeContrato], ['No cadastro', nomeForm]] : [] });
    }

    // 2. Instituição de ensino e concedente
    {
      const mIE = plano.match(/institui[çc][ãa]o de ensino\s*:\s*([^,;]+)/i);
      const mConc = plano.match(/concedente\s*:\s*([^,;]+)/i);
      const cnpjs = plano.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
      const chaves = inst.generica ? [normalizar(dados.outraInstituicao)].filter(Boolean) : inst.palavrasChave;
      const alvo = mIE ? normalizar(mIE[1]) : n;
      const ieConfere = chaves.some(k => alvo.includes(k));
      const nomeInst = inst.generica ? limpar(dados.outraInstituicao) : inst.nome;
      const problemas = [];
      if (!mIE && !ieConfere) problemas.push('a instituição de ensino não foi identificada');
      else if (!ieConfere) problemas.push(`a instituição de ensino do contrato (“${limpar(mIE[1])}”) não corresponde à selecionada (${nomeInst})`);
      if (!mConc) problemas.push('a parte concedente não foi identificada');
      if (cnpjs.length < 2) problemas.push('falta CNPJ de uma das pessoas jurídicas');
      const ok = problemas.length === 0;
      add({ id: 'partes', titulo: 'Instituição de ensino e concedente identificadas', ok, critico: true,
        detalhe: ok ? 'Instituição de ensino corresponde à selecionada e a concedente está qualificada com CNPJ.'
          : 'Problema: ' + problemas.join('; ') + '.',
        encontrado: [mIE && ['Instituição', limpar(mIE[1])], mConc && ['Concedente', limpar(mConc[1])]].filter(Boolean) });
    }

    // 3. Cidade
    {
      const cidadeForm = limpar(dados.cidade);
      const base = normalizar(cidadeForm).split(/\s*[-\/,]\s*/)[0];
      const ok = base.length > 0 && n.includes(base);
      const m = plano.match(/cidade de ([A-ZÀ-Ú][A-Za-zÀ-ÿ ]+?)\s*[–-]\s*[A-Z]{2}\b/);
      add({ id: 'cidade', titulo: 'Cidade confere com a informada', ok, critico: false,
        detalhe: ok ? `A cidade “${cidadeForm}” consta no contrato.`
          : `A cidade “${cidadeForm}” não foi encontrada no contrato${m ? ` (o contrato menciona ${limpar(m[1])})` : ''}.`,
        encontrado: m ? [['Local do estágio', limpar(m[1])]] : [] });
    }

    // 4. CPF presente e válido / 5. CPF confere com o formulário
    {
      // O CPF do estagiário é o primeiro que aparece depois da sua qualificação
      const posEstagiario = plano.search(/estagi[áa]ri[oa](?:\s*\([oa]\))?\s*:/i);
      const trecho = posEstagiario >= 0 ? plano.slice(posEstagiario) : plano;
      const mCpf = trecho.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/) || plano.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
      const cpfContrato = mCpf ? mCpf[0] : null;
      const valido = !!cpfContrato && cpfValido(cpfContrato);
      add({ id: 'cpf', titulo: 'CPF presente e válido', ok: valido, critico: false,
        detalhe: !cpfContrato ? 'Nenhum CPF foi encontrado no contrato.'
          : valido ? 'CPF presente e com dígitos verificadores válidos.'
          : `O CPF ${cpfContrato} é inválido (dígitos verificadores não conferem).`,
        encontrado: cpfContrato ? [['CPF', cpfContrato]] : [] });

      const cpfForm = soDigitos(dados.cpf);
      const confere = !!cpfContrato && soDigitos(cpfContrato) === cpfForm;
      add({ id: 'cpf-confere', titulo: 'CPF do estagiário confere com o informado no formulário', ok: confere, critico: true,
        detalhe: !cpfContrato ? 'Não há CPF do estagiário no contrato para comparar com o formulário.'
          : confere ? 'O CPF do contrato é igual ao informado no formulário.'
          : `O contrato informa o CPF ${cpfContrato}, mas o formulário informa ${mascaraCpf(cpfForm)}.`,
        encontrado: [cpfContrato && ['No contrato', cpfContrato], cpfForm && ['No formulário', mascaraCpf(cpfForm)]].filter(Boolean) });
    }

    // 5. Datas
    {
      let mIni = plano.match(/in[íi]cio\s*(?:em|:|a partir de)?\s*(\d{2}\/\d{2}\/\d{4})/i);
      let mFim = plano.match(/t[ée]rmino\s*(?:em|:|previsto para)?\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (!mIni || !mFim) {
        const mV = plano.match(/vig[êe]ncia[^0-9]{0,40}(\d{2}\/\d{2}\/\d{4})\s*(?:a|até)\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (mV) { mIni = [null, mV[1]]; mFim = [null, mV[2]]; }
      }
      const ini = mIni && parseData(mIni[1]);
      const fim = mFim && parseData(mFim[1]);
      let ok = false, detalhe;
      if (!ini || !fim) detalhe = 'Não foi possível identificar as datas de início e término da vigência.';
      else if (fim <= ini) detalhe = `A data de término (${mFim[1]}) é anterior ou igual à data de início (${mIni[1]}).`;
      else {
        const limite = new Date(ini); limite.setFullYear(limite.getFullYear() + LIMITE_ANOS);
        if (fim > limite) detalhe = `A vigência ultrapassa o limite legal de ${LIMITE_ANOS} anos (art. 11 da Lei nº 11.788/2008).`;
        else {
          ok = true;
          const meses = Math.round((fim - ini) / (1000 * 60 * 60 * 24 * 30.44));
          detalhe = `Término posterior ao início e vigência de aproximadamente ${meses} ${meses === 1 ? 'mês' : 'meses'}, dentro do limite de ${LIMITE_ANOS} anos.`;
        }
      }
      add({ id: 'datas', titulo: 'Datas de início e término coerentes', ok, critico: true, detalhe,
        encontrado: [mIni && ['Início', mIni[1]], mFim && ['Término', mFim[1]]].filter(Boolean) });
    }

    // 6. Carga horária
    {
      const mDia = plano.match(/(\d{1,2})\s*(?:\([^)]*\))?\s*horas?\s+di[áa]rias/i);
      const mSem = plano.match(/(\d{1,2})\s*(?:\([^)]*\))?\s*horas?\s+semanais/i);
      const dia = mDia ? Number(mDia[1]) : null;
      const sem = mSem ? Number(mSem[1]) : null;
      let ok = false, detalhe;
      if (dia === null && sem === null) detalhe = 'A carga horária não foi encontrada no contrato.';
      else {
        const excessos = [];
        if (dia !== null && dia > LIMITE_HORAS_DIA) excessos.push(`${dia}h diárias (máx. ${LIMITE_HORAS_DIA}h)`);
        if (sem !== null && sem > LIMITE_HORAS_SEMANA) excessos.push(`${sem}h semanais (máx. ${LIMITE_HORAS_SEMANA}h)`);
        if (dia === null || sem === null) excessos.push(`falta a carga ${dia === null ? 'diária' : 'semanal'}`);
        ok = excessos.length === 0;
        detalhe = ok ? `Jornada dentro do limite legal de ${LIMITE_HORAS_DIA}h/dia e ${LIMITE_HORAS_SEMANA}h/semana.`
          : `Jornada irregular: ${excessos.join(' e ')}, conforme art. 10, II, da Lei nº 11.788/2008.`;
      }
      add({ id: 'carga', titulo: 'Carga horária dentro do limite legal', ok, critico: true, detalhe,
        encontrado: [dia !== null && ['Diária', dia + 'h'], sem !== null && ['Semanal', sem + 'h']].filter(Boolean) });
    }

    // 7. Bolsa e auxílio-transporte
    {
      const mBolsa = plano.match(/bolsa[\s\S]{0,50}?R\$\s*([\d.]+,\d{2})/i);
      const mAux = plano.match(/aux[íi]lio[\s-]*transporte[\s\S]{0,50}?R\$\s*([\d.]+,\d{2})/i);
      const faltas = [];
      if (!mBolsa) faltas.push('valor da bolsa');
      if (!mAux) faltas.push('valor do auxílio-transporte');
      const ok = faltas.length === 0;
      add({ id: 'bolsa', titulo: 'Valor da bolsa e auxílio-transporte informados', ok, critico: false,
        detalhe: ok ? 'Bolsa e auxílio-transporte informados com valores.' : `Não foi encontrado o ${faltas.join(' nem o ')} (art. 12 da Lei nº 11.788/2008).`,
        encontrado: [mBolsa && ['Bolsa', 'R$ ' + mBolsa[1]], mAux && ['Auxílio-transporte', 'R$ ' + mAux[1]]].filter(Boolean) });
    }

    // 8. Seguro
    {
      const temSeguro = /seguro/.test(n) && /acidentes? pessoa/.test(n);
      const mApolice = plano.match(/ap[óo]lice\s*(?:n[º°o]\.?|n[úu]mero)?\s*:?\s*([A-Z0-9][A-Z0-9.\-\/]*\d[A-Z0-9.\-\/]*)/i);
      const mSeg = plano.match(/(Seguradora [^,;]+)/);
      let ok = false, detalhe;
      if (!temSeguro) detalhe = 'Não há cláusula de seguro contra acidentes pessoais.';
      else if (!mApolice) detalhe = `O seguro contra acidentes pessoais é mencionado${mSeg ? ` (${limpar(mSeg[1])})` : ''}, mas o número da apólice não foi informado.`;
      else { ok = true; detalhe = 'Seguro contra acidentes pessoais com número de apólice informado.'; }
      add({ id: 'seguro', titulo: 'Seguro contra acidentes pessoais com nº da apólice', ok, critico: true, detalhe,
        encontrado: [mSeg && ['Seguradora', limpar(mSeg[1])], mApolice && ['Apólice', mApolice[1]]].filter(Boolean) });
    }

    // 9. Supervisor
    {
      const m = plano.match(/supervis[oa]r(?:\s*\([oa]\))?(?:\s+do\s+est[áa]gio)?\s*:\s*([^,;\n]+)/i);
      const ok = !!(m && limpar(m[1]).length > 3);
      add({ id: 'supervisor', titulo: 'Supervisor do estágio identificado', ok, critico: false,
        detalhe: ok ? 'Supervisor da concedente identificado nominalmente.' : 'O supervisor do estágio não foi identificado (art. 9º, III, da Lei nº 11.788/2008).',
        encontrado: ok ? [['Supervisor', limpar(m[1])]] : [] });
    }

    // 10. Assinaturas
    {
      const idx = n.lastIndexOf('assinaturas');
      const secao = idx >= 0 ? n.slice(idx) : n.slice(-1500);
      const partes = [
        { chave: 'estagiari', nome: 'Estagiário(a)' },
        { chave: 'instituicao de ensino', nome: 'Instituição de ensino' },
        { chave: 'concedente', nome: 'Concedente' }
      ].map(p => Object.assign(p, { pos: secao.indexOf(p.chave) }));
      const ordenadas = partes.filter(p => p.pos >= 0).sort((a, b) => a.pos - b.pos);
      ordenadas.forEach((p, i) => {
        const trecho = secao.slice(p.pos, i + 1 < ordenadas.length ? ordenadas[i + 1].pos : undefined);
        p.assinado = /assinad[oa]/.test(trecho) && !/pendente|nao assinad/.test(trecho);
      });
      const faltantes = partes.filter(p => !p.assinado).map(p => p.nome.toLowerCase());
      const ok = faltantes.length === 0;
      add({ id: 'assinaturas', titulo: 'Assinaturas das três partes', ok, critico: true,
        detalhe: ok ? 'Estagiário(a), instituição de ensino e concedente assinaram o termo.'
          : `Falta a assinatura de: ${faltantes.join(', ')}. O termo só tem validade com as três assinaturas.`,
        encontrado: partes.map(p => [p.nome, p.assinado ? 'assinado ✓' : 'pendente ✗']) });
    }

    const falhas = itens.filter(i => !i.ok);
    const status = falhas.length === 0 ? 'aprovado' : (falhas.some(i => i.critico) ? 'reprovado' : 'pendencias');
    return { itens, status, acertos: itens.length - falhas.length, total: itens.length, semTexto: plano.length < 50 };
  }

  return { verificar, cpfValido, mascaraCpf, soDigitos, normalizar };
})();
