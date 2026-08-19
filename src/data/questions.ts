import { Dimension, Question } from '../types';

export const DIMENSIONS: Dimension[] = [
  { 
    id: 'dim-org', 
    name: 'Organização do Trabalho', 
    description: 'Demanda, divisão de tarefas, ritmo, recursos disponíveis e condições operacionais.',
    items: [1, 2, 3, 4, 5, 6, 7] 
  },
  { 
    id: 'dim-aut', 
    name: 'Autonomia e Controle', 
    description: 'Controle sobre o ritmo, liberdade de decisão, planejamento e flexibilidade na execução.',
    items: [8, 9, 10, 11] 
  },
  { 
    id: 'dim-lid', 
    name: 'Liderança', 
    description: 'Apoio e suporte da gestão, feedback construtivo, clareza nas diretrizes e valorização.',
    items: [12, 13, 14, 15, 16, 17] 
  },
  { 
    id: 'dim-rel', 
    name: 'Relacionamento e Apoio Social', 
    description: 'Cooperação entre colegas, clima de confiança, respeito e suporte mútuo.',
    items: [18, 19, 20, 21, 22, 23] 
  },
  { 
    id: 'dim-sau', 
    name: 'Saúde Mental e Equilíbrio', 
    description: 'Prevenção ao estresse ocupacional, conciliação com a vida pessoal e combate à exaustão.',
    items: [24, 25, 26, 27, 28, 29] 
  },
  { 
    id: 'dim-seg', 
    name: 'Segurança Psicológica e Ética', 
    description: 'Liberdade para manifestar opiniões sem medo de represália, canais de relato e prevenção a assédios.',
    items: [30, 31, 32, 33, 34, 35, 36, 37, 38] 
  },
];

export const QUESTIONS: Question[] = [
  // 1..7: Organização do Trabalho
  { id: 1, text: 'No meu local de trabalho existem recursos, ferramentas e planejamento adequados para a realização das minhas tarefas.', dimensionId: 'dim-org' },
  { id: 2, text: 'O volume e os prazos exigidos no meu trabalho são distribuídos de maneira equilibrada e exequível.', dimensionId: 'dim-org' },
  { id: 3, text: 'Sei com clareza quais são as minhas responsabilidades e o que a organização espera do meu desempenho.', dimensionId: 'dim-org' },
  { id: 4, text: 'Salvo raras exceções, consigo cumprir meus horários de trabalho e pausas regulares para descanso.', dimensionId: 'dim-org' },
  { id: 5, text: 'As condições ambientais físicas (iluminação, temperatura, ruído) são adequadas para a minha atividade.', dimensionId: 'dim-org' },
  { id: 6, text: 'O fluxo de comunicação e as instruções operacionais para o trabalho chegam de forma ágil e sem ruídos.', dimensionId: 'dim-org' },
  { id: 7, text: 'Consigo realizar meu trabalho sem sobrecargas repentinas ou interrupções constantes.', dimensionId: 'dim-org' },

  // 8..11: Autonomia e Controle
  { id: 8, text: 'Autonomia na forma e na ordem das tarefas.', dimensionId: 'dim-aut' },
  { id: 9, text: 'Controle sobre o ritmo de trabalho.', dimensionId: 'dim-aut' },
  { id: 10, text: 'Sou incentivado a participar e opinar sobre melhorias nos processos e rotinas da minha área.', dimensionId: 'dim-aut' },
  { id: 11, text: 'Tenho flexibilidade para planejar e organizar a execução das minhas entregas.', dimensionId: 'dim-aut' },

  // 12..17: Liderança
  { id: 12, text: 'A comunicação com meu gestor/supervisor direto é clara, transparente e acessível.', dimensionId: 'dim-lid' },
  { id: 13, text: 'Feedback construtivo da liderança.', dimensionId: 'dim-lid' },
  { id: 14, text: 'Quando surgem dificuldades operacionais ou imprevistos, sei que posso contar com o apoio da liderança.', dimensionId: 'dim-lid' },
  { id: 15, text: 'A liderança atua de forma justa, imparcial e ética no tratamento de todos os membros da equipe.', dimensionId: 'dim-lid' },
  { id: 16, text: 'Minha liderança incentiva o desenvolvimento profissional e o aprendizado contínuo.', dimensionId: 'dim-lid' },
  { id: 17, text: 'Trabalho reconhecido e valorizado.', dimensionId: 'dim-lid' },

  // 18..23: Relacionamento e Apoio Social
  { id: 18, text: 'O clima de convivência entre os colegas da minha equipe é harmonioso, respeitoso e colaborativo.', dimensionId: 'dim-rel' },
  { id: 19, text: 'Se precisar de auxílio técnico ou suporte no dia a dia, posso contar prontamente com meus colegas de trabalho.', dimensionId: 'dim-rel' },
  { id: 20, text: 'Existe cooperação entre as diferentes áreas e setores para o atingimento dos objetivos comuns.', dimensionId: 'dim-rel' },
  { id: 21, text: 'Os conflitos interpessoais na equipe são tratados com maturidade, diálogo e respeito mútuo.', dimensionId: 'dim-rel' },
  { id: 22, text: 'Sinto que faço parte de uma equipe unida e que trabalha em prol dos mesmos propósitos.', dimensionId: 'dim-rel' },
  { id: 23, text: 'Há respeito mútuo e cordialidade nas interações cotidianas de trabalho.', dimensionId: 'dim-rel' },

  // 24..29: Saúde Mental e Equilíbrio
  { id: 24, text: 'A rotina de trabalho não me causa níveis excessivos de estresse, tensão ou ansiedade.', dimensionId: 'dim-sau' },
  { id: 25, text: 'O meu trabalho me permite manter um equilíbrio saudável entre a vida profissional e a vida pessoal/familiar.', dimensionId: 'dim-sau' },
  { id: 26, text: 'Ao final da jornada de trabalho, não me sinto frequentemente exausto física ou emocionalmente.', dimensionId: 'dim-sau' },
  { id: 27, text: 'A empresa respeita os períodos de desconexão, descanso, férias e bem-estar do trabalhador.', dimensionId: 'dim-sau' },
  { id: 28, text: 'Consigo manter meu foco e tranquilidade mental durante o desempenho das minhas tarefas.', dimensionId: 'dim-sau' },
  { id: 29, text: 'Sinto-me disposto e motivado ao iniciar a minha jornada de trabalho.', dimensionId: 'dim-sau' },

  // 30..38: Segurança Psicológica e Ética
  { id: 30, text: 'Expressar opiniões sem medo de represália.', dimensionId: 'dim-seg' },
  { id: 31, text: 'Opiniões consideradas pela gestão.', dimensionId: 'dim-seg' },
  { id: 32, text: 'Segurança / Estabilidade do Emprego.', dimensionId: 'dim-seg', isConductIndicator: 'stability' },
  { id: 33, text: 'Sinto-me seguro no ambiente de trabalho e com confiança nas diretrizes institucionais.', dimensionId: 'dim-seg' },
  { id: 34, text: 'O ambiente de trabalho estimula a transparência, a integridade e a confiança mútua.', dimensionId: 'dim-seg' },
  { id: 35, text: 'Conhece os canais para relatar problemas.', dimensionId: 'dim-seg' },
  { id: 36, text: 'Ações de promoção de bem-estar.', dimensionId: 'dim-seg' },
  { id: 37, text: 'No meu ambiente de trabalho NÃO presenciei nem vivenciei situações de assédio moral, humilhação ou desrespeito.', dimensionId: 'dim-seg', isConductIndicator: 'bullying' },
  { id: 38, text: 'No meu ambiente de trabalho NÃO presenciei nem vivenciei condutas inadequadas ou assédio de natureza sexual.', dimensionId: 'dim-seg', isConductIndicator: 'sexual_harassment' },
];
