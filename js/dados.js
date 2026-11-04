/* Dados simulados das instituições e critérios de verificação. */
window.DADOS = (function () {
  'use strict';

  const REQUISITOS_LEGAIS = [
    'Termo de Compromisso assinado pelas três partes',
    'Jornada de até 6h diárias e 30h semanais',
    'Vigência máxima de 2 anos na mesma concedente',
    'Seguro contra acidentes pessoais com nº da apólice',
    'Bolsa e auxílio-transporte (estágio não obrigatório)',
    'Supervisor com formação ou experiência na área'
  ];

  const INSTITUICOES = {
    univale: {
      nome: 'Univale – Universidade Vale do Rio Doce',
      sigla: 'UNIVALE',
      cor: '#0b5394',
      local: 'Governador Valadares – MG',
      palavrasChave: ['univale', 'universidade vale do rio doce'],
      setor: 'Central de Estágios',
      prazo: 'Até 5 dias úteis',
      vias: '3 vias',
      requisitos: REQUISITOS_LEGAIS.concat([
        'Plano de atividades anexo ao termo',
        'Assinatura do professor orientador'
      ]),
      nota: 'Informações fictícias para demonstração do protótipo.'
    },
    horizonte: {
      nome: 'Faculdade Horizonte de Tecnologia',
      sigla: 'FHT',
      cor: '#7c3aed',
      local: 'Belo Horizonte – MG',
      palavrasChave: ['faculdade horizonte', 'fht'],
      setor: 'Núcleo de Carreiras',
      prazo: 'Até 3 dias úteis',
      vias: 'Digital (assinatura eletrônica)',
      requisitos: REQUISITOS_LEGAIS.concat([
        'Assinatura eletrônica das três partes',
        'Relatório semestral de atividades'
      ]),
      nota: 'Instituição fictícia para demonstração do protótipo.'
    },
    outra: {
      nome: 'Outra instituição',
      sigla: '?',
      cor: '#64748b',
      local: 'Informe o nome da instituição',
      generica: true,
      palavrasChave: [],
      setor: 'Setor de estágios da instituição',
      prazo: 'Consulte a instituição',
      vias: '3 vias',
      requisitos: REQUISITOS_LEGAIS,
      nota: 'Serão aplicados apenas os requisitos da Lei nº 11.788/2008.'
    }
  };

  const CRITERIOS = [
    'Nome do estagiário confere',
    'Instituição de ensino e concedente',
    'Cidade confere',
    'CPF presente e válido',
    'CPF confere com o formulário',
    'Datas de início e término',
    'Carga horária legal',
    'Bolsa e auxílio-transporte',
    'Seguro com nº da apólice',
    'Supervisor identificado',
    'Assinaturas das três partes'
  ];

  const DEMO = {
    nome: 'Mariana Alves Costa',
    cpf: '529.982.247-25',
    cidade: 'Governador Valadares',
    instituicao: 'univale'
  };

  return { INSTITUICOES, CRITERIOS, DEMO };
})();
