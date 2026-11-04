/* Dados simulados do Banco de Currículos: listas, perfis de curso e candidatos de exemplo. */
window.CURRICULOS_DADOS = (function () {
  'use strict';

  const UFS = [
    ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
    ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
    ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
    ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
    ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
    ['SE', 'Sergipe'], ['TO', 'Tocantins']
  ];

  const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];

  // Perfil de cada curso usado pelo gerador: área de atuação, duração (em períodos) e habilidades típicas
  const CURSOS = {
    'Administração': { area: 'administração e gestão', duracao: 8, habilidades: ['Rotinas administrativas', 'Excel avançado', 'Atendimento ao cliente', 'Organização e planejamento'] },
    'Arquitetura e Urbanismo': { area: 'arquitetura e projetos', duracao: 10, habilidades: ['AutoCAD', 'SketchUp', 'Desenho técnico', 'Representação gráfica'] },
    'Ciências Contábeis': { area: 'contabilidade e finanças', duracao: 8, habilidades: ['Lançamentos contábeis', 'Conciliação bancária', 'Excel avançado', 'Rotinas fiscais'] },
    'Ciência da Computação': { area: 'desenvolvimento de software', duracao: 8, habilidades: ['Lógica de programação', 'Estruturas de dados', 'Banco de dados SQL', 'Git'] },
    'Direito': { area: 'jurídica', duracao: 10, habilidades: ['Pesquisa jurisprudencial', 'Redação de peças processuais', 'Acompanhamento processual', 'Atendimento ao público'] },
    'Educação Física': { area: 'educação física e esportes', duracao: 8, habilidades: ['Planejamento de treinos', 'Recreação', 'Avaliação física', 'Primeiros socorros'] },
    'Enfermagem': { area: 'saúde e enfermagem', duracao: 10, habilidades: ['Aferição de sinais vitais', 'Biossegurança', 'Humanização do atendimento', 'Registro em prontuário'] },
    'Engenharia Civil': { area: 'engenharia e construção civil', duracao: 10, habilidades: ['AutoCAD', 'Leitura de projetos', 'Orçamento de obras', 'Acompanhamento de obras'] },
    'Engenharia de Produção': { area: 'engenharia de produção e processos', duracao: 10, habilidades: ['Mapeamento de processos', 'Excel avançado', 'Indicadores de desempenho', 'Lean Manufacturing'] },
    'Marketing': { area: 'marketing e comunicação', duracao: 4, habilidades: ['Redes sociais', 'Produção de conteúdo', 'Canva', 'Análise de métricas'] },
    'Nutrição': { area: 'nutrição', duracao: 8, habilidades: ['Avaliação nutricional', 'Elaboração de cardápios', 'Educação alimentar', 'Boas práticas de manipulação'] },
    'Pedagogia': { area: 'educação', duracao: 8, habilidades: ['Planejamento de aulas', 'Alfabetização', 'Mediação de conflitos', 'Recursos didáticos'] },
    'Psicologia': { area: 'psicologia', duracao: 10, habilidades: ['Escuta qualificada', 'Recrutamento e seleção', 'Dinâmicas de grupo', 'Elaboração de relatórios'] },
    'Sistemas de Informação': { area: 'tecnologia da informação', duracao: 8, habilidades: ['Lógica de programação', 'Banco de dados SQL', 'Desenvolvimento web (HTML/CSS/JS)', 'Suporte técnico'] }
  };
  const CURSO_PADRAO = { duracao: 8, habilidades: ['Pacote Office', 'Organização', 'Atendimento ao público'] };

  // Termos reconhecidos nas descrições das experiências (forma normalizada → como aparece no currículo)
  const TERMOS = [
    ['react', 'React'], ['javascript', 'JavaScript'], ['python', 'Python'], ['java ', 'Java'], ['sql', 'SQL'],
    ['api rest', 'APIs REST'], ['git', 'Git'], ['power bi', 'Power BI'], ['excel', 'Excel avançado'],
    ['autocad', 'AutoCAD'], ['revit', 'Revit'], ['sketchup', 'SketchUp'], ['photoshop', 'Photoshop'], ['canva', 'Canva'],
    ['atendimento', 'Atendimento ao cliente'], ['vendas', 'Vendas'], ['recrutamento', 'Recrutamento e seleção'],
    ['conciliacao bancaria', 'Conciliação bancária'], ['lancamentos contabeis', 'Lançamentos contábeis'],
    ['pje', 'Processo Judicial Eletrônico (PJe)'], ['peticoes', 'Redação de peças processuais'],
    ['suporte', 'Suporte técnico'], ['redes', 'Redes de computadores'], ['manutencao', 'Manutenção de computadores'],
    ['ensino', 'Didática'], ['monitor', 'Didática'], ['vacinacao', 'Imunização'], ['quantitativos', 'Levantamento de quantitativos'],
    ['renderizacao', 'Renderização 3D'], ['ingles', 'Inglês']
  ];

  // Gera CPFs válidos a partir de 9 dígitos (para os candidatos fictícios)
  function cpf(base) {
    const d = base.split('').map(Number);
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += d[i] * (t + 1 - i);
      d.push(((soma * 10) % 11) % 10);
    }
    const s = d.join('');
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  }

  const SEMENTES = [
    {
      nome: 'Ana Beatriz Rocha', cpf: cpf('284615037'), nascimento: '2003-04-12', email: 'ana.rocha@example.com',
      cidade: 'Governador Valadares', uf: 'MG', curso: 'Administração', periodo: '6', turno: 'Noturno', publicadoEm: '2026-10-28',
      experiencias: [
        { cargo: 'Assistente de vendas', empresa: 'Loja Moda Center', inicio: '2023-08', fim: '', descricao: 'Atendimento ao cliente e vendas no balcão; controle de estoque em planilhas de Excel; fechamento de caixa diário' },
        { cargo: 'Jovem aprendiz administrativo', empresa: 'Supermercado Vale Verde', inicio: '2022-02', fim: '2023-06', descricao: 'Organização de documentos e arquivos; lançamento de notas fiscais no sistema; apoio ao setor de compras' }
      ]
    },
    {
      nome: 'Gabriel Souza Martins', cpf: cpf('395027461'), nascimento: '2002-11-03', email: 'gabriel.martins@example.com',
      cidade: 'Ipatinga', uf: 'MG', curso: 'Sistemas de Informação', periodo: '7', turno: 'Matutino', publicadoEm: '2026-10-25',
      experiencias: [
        { cargo: 'Monitor de Banco de Dados', empresa: 'Faculdade de Tecnologia do Vale', inicio: '2025-02', fim: '', descricao: 'Apoio a alunos na modelagem de dados e consultas SQL; correção de listas de exercícios; plantões de dúvidas semanais' },
        { cargo: 'Desenvolvedor voluntário', empresa: 'Projeto Código Social', inicio: '2024-03', fim: '2024-12', descricao: 'Desenvolvimento do site institucional em React; integração com API REST; versionamento com Git' }
      ]
    },
    {
      nome: 'Juliana Ferreira Lopes', cpf: cpf('517308264'), nascimento: '2001-07-22', email: 'juliana.lopes@example.com',
      cidade: 'Belo Horizonte', uf: 'MG', curso: 'Direito', periodo: '8', turno: 'Vespertino', publicadoEm: '2026-10-21',
      experiencias: [
        { cargo: 'Estágio jurídico', empresa: 'Escritório Moreira & Campos Advocacia', inicio: '2025-01', fim: '', descricao: 'Elaboração de petições iniciais e recursos; acompanhamento de prazos no PJe; pesquisa de jurisprudência' },
        { cargo: 'Atendimento no Núcleo de Prática Jurídica', empresa: 'Universidade (NPJ)', inicio: '2024-03', fim: '2024-12', descricao: 'Atendimento à população em questões de família e consumidor; redação de petições sob supervisão' }
      ]
    },
    {
      nome: 'Pedro Henrique Alves', cpf: cpf('602941358'), nascimento: '2001-02-09', email: 'pedro.alves@example.com',
      cidade: 'Vitória', uf: 'ES', curso: 'Engenharia Civil', periodo: '9', turno: 'Integral', publicadoEm: '2026-10-18',
      experiencias: [
        { cargo: 'Auxiliar de projetos', empresa: 'Construtora Horizonte Capixaba', inicio: '2025-02', fim: '', descricao: 'Elaboração de plantas no AutoCAD e modelagem no Revit; levantamento de quantitativos para orçamentos; visitas técnicas a obras' },
        { cargo: 'Iniciação científica', empresa: 'Laboratório de Materiais de Construção', inicio: '2023-08', fim: '2024-12', descricao: 'Ensaios de resistência de concreto; tabulação de resultados no Excel; apresentação em seminário de pesquisa' }
      ]
    },
    {
      nome: 'Camila Duarte Santos', cpf: cpf('713582049'), nascimento: '2004-01-30', email: 'camila.santos@example.com',
      cidade: 'Teófilo Otoni', uf: 'MG', curso: 'Enfermagem', periodo: '6', turno: 'Matutino', publicadoEm: '2026-10-15',
      experiencias: [
        { cargo: 'Voluntária em campanha de vacinação', empresa: 'Secretaria Municipal de Saúde', inicio: '2024-04', fim: '2024-06', descricao: 'Apoio na triagem e no registro de vacinação; orientação à população sobre o calendário vacinal' },
        { cargo: 'Monitora de Anatomia', empresa: 'Faculdade de Ciências da Saúde', inicio: '2023-08', fim: '2024-07', descricao: 'Ensino de anatomia em aulas práticas de laboratório; preparação de material de estudo' }
      ]
    },
    {
      nome: 'Rafael Oliveira Castro', cpf: cpf('820463175'), nascimento: '2005-06-17', email: 'rafael.castro@example.com',
      cidade: 'Governador Valadares', uf: 'MG', curso: 'Ciências Contábeis', periodo: '4', turno: 'Noturno', publicadoEm: '2026-10-11',
      experiencias: [
        { cargo: 'Auxiliar administrativo', empresa: 'Escritório Contábil Valadares', inicio: '2024-05', fim: '', descricao: 'Lançamentos contábeis e conciliação bancária; emissão de guias de impostos; organização de documentos de clientes' }
      ]
    },
    {
      nome: 'Larissa Mendes Prado', cpf: cpf('931724586'), nascimento: '2002-09-05', email: 'larissa.prado@example.com',
      cidade: 'São Paulo', uf: 'SP', curso: 'Psicologia', periodo: '7', turno: 'Vespertino', publicadoEm: '2026-10-07',
      experiencias: [
        { cargo: 'Apoio em recrutamento e seleção (voluntária)', empresa: 'ONG Caminhos', inicio: '2024-08', fim: '', descricao: 'Triagem de currículos e entrevistas iniciais; condução de dinâmicas de grupo; recrutamento de voluntários' },
        { cargo: 'Projeto de extensão em saúde mental', empresa: 'Clínica-escola de Psicologia', inicio: '2023-03', fim: '2024-06', descricao: 'Organização de rodas de conversa em escolas públicas; elaboração de materiais informativos' }
      ]
    },
    {
      nome: 'Thiago Lima Rezende', cpf: cpf('148375920'), nascimento: '2004-12-14', email: 'thiago.rezende@example.com',
      cidade: 'Rio de Janeiro', uf: 'RJ', curso: 'Arquitetura e Urbanismo', periodo: '5', turno: 'Matutino', publicadoEm: '2026-10-02',
      experiencias: [
        { cargo: 'Desenhista projetista (freelancer)', empresa: 'Projetos residenciais autônomos', inicio: '2024-01', fim: '', descricao: 'Modelagem 3D no SketchUp e renderização de ambientes; detalhamento de plantas no AutoCAD; atendimento a clientes' }
      ]
    }
  ];

  const DEMO = {
    nome: 'Lucas Henrique Barbosa', cpf: '111.444.777-35', nascimento: '2004-08-15', email: 'lucas.barbosa@example.com',
    cidade: 'Governador Valadares', uf: 'MG', curso: 'Sistemas de Informação', periodo: '5', turno: 'Noturno',
    experiencias: [
      { cargo: 'Assistente de suporte de TI', empresa: 'Conecta Informática', inicio: '2024-02', fim: '', descricao: 'atendimento a clientes e suporte técnico em computadores e redes; manutenção preventiva de equipamentos; cadastro de chamados no sistema' },
      { cargo: 'Monitor de Algoritmos', empresa: 'Univale', inicio: '2025-03', fim: '2025-12', descricao: 'apoio a alunos do 1º período em lógica de programação com Python; correção de exercícios; plantões de dúvidas' }
    ]
  };

  return { UFS, TURNOS, CURSOS, CURSO_PADRAO, TERMOS, SEMENTES, DEMO };
})();
