import { 
  Company, AssessmentSession, AnalyticsReport, 
  DimensionScore, DepartmentRiskScore, CriticalItem, RiskLevel, 
  FavorabilityLevel, DepartmentFavorabilityScore, ConductIndicatorStats 
} from '../types';
import { QUESTIONS, DIMENSIONS } from '../data/questions';

export interface DepartmentProgress {
  departmentId: string;
  departmentName: string;
  headcount: number;
  completedCount: number;
  remainingCount: number;
  percentage: number;
  isCompleted: boolean;
}

export interface CompanyAssessmentProgress {
  totalRequired: number;
  totalCompleted: number;
  remainingCount: number;
  percentage: number;
  isFullyCompleted: boolean;
  departmentProgress: DepartmentProgress[];
}

export function getCompanyAssessmentProgress(company: Company, sessions: AssessmentSession[]): CompanyAssessmentProgress {
  const companySessions = sessions.filter(s => s.companyId === company.id);
  const totalCompleted = companySessions.length;
  
  // Base de colaboradores: se inserido o total de colaboradores que responderam, esta quantidade é a base de cálculo do censo
  const effectiveTarget = (company.respondedEmployeeCount !== undefined && company.respondedEmployeeCount > 0)
    ? company.respondedEmployeeCount
    : (company.employeeCount || 1);

  const depts = company.departments && company.departments.length > 0
    ? company.departments
    : [{ id: 'dp-geral', companyId: company.id, name: 'Geral', roles: ['Colaborador'], headcount: effectiveTarget }];

  const totalRequired = effectiveTarget;

  const departmentProgress: DepartmentProgress[] = depts.map(dept => {
    const deptSessions = companySessions.filter(s => s.departmentId === dept.id || s.departmentName === dept.name);
    const completed = deptSessions.length;
    const required = Number(dept.headcount) || (totalRequired > 0 ? Math.ceil(totalRequired / depts.length) : 1);
    const remaining = Math.max(0, required - completed);
    const percentage = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 100;
    
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      headcount: required,
      completedCount: completed,
      remainingCount: remaining,
      percentage,
      isCompleted: completed >= required && required > 0
    };
  });

  const remainingCount = Math.max(0, totalRequired - totalCompleted);
  const percentage = totalRequired > 0 ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100)) : 0;
  const isFullyCompleted = totalCompleted >= totalRequired && totalRequired > 0;

  return {
    totalRequired,
    totalCompleted,
    remainingCount,
    percentage,
    isFullyCompleted,
    departmentProgress
  };
}

/**
 * Converte a pontuação de Favorabilidade de 0 a 100 na classificação regulatória HSE-IT:
 * >= 67.0 -> Favorável (Baixo Risco)
 * 40.0 a 66.9 -> Atenção (Risco Moderado)
 * < 40.0 -> Crítico (Risco Alto)
 */
export function getFavorabilityClassification(score100: number): {
  level: FavorabilityLevel;
  riskLevel: RiskLevel;
  label: string;
  badgeClass: string;
} {
  if (score100 >= 67.0) {
    return {
      level: 'favorable',
      riskLevel: 'low',
      label: 'Favorável',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  } else if (score100 >= 40.0) {
    return {
      level: 'warning',
      riskLevel: 'moderate',
      label: 'Atenção',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  } else {
    return {
      level: 'critical',
      riskLevel: 'high',
      label: 'Crítico',
      badgeClass: 'bg-red-100 text-red-800 border-red-300'
    };
  }
}

export function scoreToFavorability(avgScore1To4: number): number {
  const norm = ((avgScore1To4 - 1) / 3) * 100;
  return Number(Math.max(0, Math.min(100, norm)).toFixed(1));
}

/**
 * Calculates official HSE-IT statistical analytics and favorability index
 * completely dynamically based on the company's real data and collected sessions.
 */
export function calculateRealTimeAnalytics(company: Company, sessions: AssessmentSession[]): AnalyticsReport {
  const companySessions = sessions.filter(s => s.companyId === company.id);
  const hasSessions = companySessions.length > 0;

  const depts = company.departments && company.departments.length > 0
    ? company.departments
    : [{ id: 'dp-geral', companyId: company.id, name: 'Geral', roles: ['Colaborador'], headcount: company.employeeCount || 1 }];

  const totalEmployees = depts.reduce((sum, d) => sum + (Number(d.headcount) || 0), 0) || company.employeeCount || 1;
  const evaluatedEmployees = companySessions.length;
  const unansweredEmployees = Math.max(0, totalEmployees - evaluatedEmployees);
  const adherenceRate = totalEmployees > 0 ? Number(((evaluatedEmployees / totalEmployees) * 100).toFixed(1)) : 0;
  const unansweredRate = totalEmployees > 0 ? Number(((unansweredEmployees / totalEmployees) * 100).toFixed(1)) : 0;

  // 1. Calculate question-level stats across all sessions for this company
  const allItemStats = QUESTIONS.map(q => {
    const qScores = companySessions
      .map(s => s.responses?.find(r => r.questionId === q.id)?.score)
      .filter((score): score is 1 | 2 | 3 | 4 => score !== undefined);

    let avgScore = 3.25;
    let dist = { 1: 0, 2: 0, 3: 0, 4: 0 };

    if (qScores.length > 0) {
      const sum = qScores.reduce((acc, val) => acc + val, 0);
      avgScore = Number((sum / qScores.length).toFixed(2));
      dist = {
        1: qScores.filter(s => s === 1).length,
        2: qScores.filter(s => s === 2).length,
        3: qScores.filter(s => s === 3).length,
        4: qScores.filter(s => s === 4).length,
      };
    } else {
      // Baseline if no answers yet
      dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
    }

    const favorabilityIndex = scoreToFavorability(avgScore);
    const dim = DIMENSIONS.find(d => d.id === q.dimensionId);

    const totalResp = qScores.length || 1;
    const stronglyDisagreeRate = Number(((dist[1] / totalResp) * 100).toFixed(1));
    const disagreeRate = Number(((dist[2] / totalResp) * 100).toFixed(1));
    const agreeRate = Number(((dist[3] / totalResp) * 100).toFixed(1));
    const stronglyAgreeRate = Number(((dist[4] / totalResp) * 100).toFixed(1));
    const disagreementRate = Number((stronglyDisagreeRate + disagreeRate).toFixed(1));

    return {
      questionId: q.id,
      text: q.text,
      dimensionId: q.dimensionId,
      dimensionName: dim?.name || 'Dimensão',
      avgScore,
      favorabilityIndex,
      disagreementRate,
      stronglyDisagreeRate,
      disagreeRate,
      agreeRate,
      stronglyAgreeRate,
      scoreDistribution: dist
    };
  });

  // 2. Calculate Dimension Scores
  const dimensionScores: DimensionScore[] = DIMENSIONS.map(dim => {
    const dimItemStats = allItemStats.filter(item => dim.items.includes(item.questionId));
    const avgScore = Number((dimItemStats.reduce((sum, item) => sum + item.avgScore, 0) / dimItemStats.length).toFixed(2));
    const favorabilityIndex = scoreToFavorability(avgScore);
    const classif = getFavorabilityClassification(favorabilityIndex);
    const disagreementRate = Number((dimItemStats.reduce((sum, item) => sum + item.disagreementRate, 0) / dimItemStats.length).toFixed(1));

    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      averageScore: avgScore,
      favorabilityIndex,
      riskLevel: classif.riskLevel,
      favorabilityLevel: classif.level,
      disagreementRate,
      totalResponses: evaluatedEmployees
    };
  });

  // Overall Global Scores
  const overallScore = Number((dimensionScores.reduce((sum, d) => sum + d.averageScore, 0) / dimensionScores.length).toFixed(2));
  const overallFavorability = scoreToFavorability(overallScore);
  const overallClassif = getFavorabilityClassification(overallFavorability);

  // 3. Calculate Department Scores for each department of this company
  const departmentScores: DepartmentRiskScore[] = depts.map(dept => {
    const deptSessions = companySessions.filter(s => s.departmentId === dept.id || s.departmentName === dept.name);
    const respondentsCount = deptSessions.length;
    const totalDept = Number(dept.headcount) || respondentsCount || 1;
    const deptAdherence = totalDept > 0 ? Number(((respondentsCount / totalDept) * 100).toFixed(1)) : 0;
    const percentageOfTotal = evaluatedEmployees > 0 ? Number(((respondentsCount / evaluatedEmployees) * 100).toFixed(1)) : 0;
    const isSmallSample = respondentsCount < 12;

    const deptDimensionScores: DepartmentFavorabilityScore[] = DIMENSIONS.map(dim => {
      let dimAvg = 3.2;
      if (respondentsCount > 0) {
        const dimScores = deptSessions.flatMap(s => 
          s.responses.filter(r => dim.items.includes(r.questionId)).map(r => r.score)
        );
        if (dimScores.length > 0) {
          dimAvg = Number((dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(2));
        }
      }
      const dimFav = scoreToFavorability(dimAvg);
      const dimClassif = getFavorabilityClassification(dimFav);

      return {
        dimensionId: dim.id,
        dimensionName: dim.name,
        favorabilityIndex: dimFav,
        favorabilityLevel: dimClassif.level,
        averageScore: dimAvg
      };
    });

    const deptAvgScore = Number((deptDimensionScores.reduce((sum, d) => sum + d.averageScore, 0) / deptDimensionScores.length).toFixed(2));
    const deptFavorability = scoreToFavorability(deptAvgScore);
    const deptClassif = getFavorabilityClassification(deptFavorability);

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      respondentsCount,
      totalEmployees: totalDept,
      adherenceRate: deptAdherence,
      percentageOfTotal,
      isSmallSample,
      averageScore: deptAvgScore,
      favorabilityIndex: deptFavorability,
      riskLevel: deptClassif.riskLevel,
      favorabilityLevel: deptClassif.level,
      dimensionScores: deptDimensionScores
    };
  });

  // 4. Conduct Indicators
  // 4.1 Job Stability (Q32)
  const q32Stat = allItemStats.find(i => i.questionId === 32);
  const stabilityOverallFav = q32Stat ? q32Stat.favorabilityIndex : 80;
  const stabilityDeptStats = depts.map(dept => {
    const deptSessions = companySessions.filter(s => s.departmentId === dept.id || s.departmentName === dept.name);
    const deptQ32Scores = deptSessions.map(s => s.responses.find(r => r.questionId === 32)?.score).filter((s): s is 1|2|3|4 => s !== undefined);
    const avg = deptQ32Scores.length > 0 ? (deptQ32Scores.reduce((a, b) => a + b, 0) / deptQ32Scores.length) : (q32Stat?.avgScore || 3.4);
    const fav = scoreToFavorability(avg);
    const affected = deptQ32Scores.filter(s => s >= 3).length;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      rate: fav,
      affectedCount: affected,
      totalDept: deptSessions.length || (dept.headcount || 1),
      status: getFavorabilityClassification(fav).level,
      favorabilityIndex: fav
    };
  });

  const stabilityStats: ConductIndicatorStats = {
    title: 'Segurança / Estabilidade no Emprego',
    dimension: 'Segurança Psicológica e Ética',
    overallFavorability: stabilityOverallFav,
    overallRate: stabilityOverallFav,
    overallAffectedCount: q32Stat ? (q32Stat.scoreDistribution[3] + q32Stat.scoreDistribution[4]) : 0,
    totalParticipants: evaluatedEmployees,
    status: getFavorabilityClassification(stabilityOverallFav).level,
    distribution: {
      nunca: q32Stat?.scoreDistribution[1] || 0,
      raramente: q32Stat?.scoreDistribution[2] || 0,
      asVezes: q32Stat?.scoreDistribution[3] || 0,
      frequente: Math.floor((q32Stat?.scoreDistribution[4] || 0) / 2),
      sempre: Math.ceil((q32Stat?.scoreDistribution[4] || 0) / 2)
    },
    departmentStats: stabilityDeptStats,
    interpretiveNotes: `Índice de estabilidade com avaliação ${getFavorabilityClassification(stabilityOverallFav).label.toLowerCase()} em ${company.tradeName} (${stabilityOverallFav}% no geral), constituindo um importante fator de proteção psicossocial e engajamento.`
  };

  // 4.2 Moral Harassment (Q37: "No meu ambiente de trabalho NÃO presenciei nem vivenciei situações de assédio moral...")
  // Disagreeing (score 1 or 2) implies occurrence/witnessing
  const q37Stat = allItemStats.find(i => i.questionId === 37);
  const q37Scores = companySessions.map(s => s.responses.find(r => r.questionId === 37)?.score).filter((s): s is 1|2|3|4 => s !== undefined);
  const moralAffectedCount = q37Scores.filter(s => s <= 2).length;
  const moralRate = q37Scores.length > 0 ? Number(((moralAffectedCount / q37Scores.length) * 100).toFixed(1)) : 0;
  const moralFrequentRate = q37Scores.length > 0 ? Number(((q37Scores.filter(s => s === 1).length / q37Scores.length) * 100).toFixed(1)) : 0;
  const moralStatus: FavorabilityLevel = moralRate > 25 ? 'critical' : moralRate >= 10 ? 'warning' : 'favorable';

  const moralDeptStats = depts.map(dept => {
    const deptSessions = companySessions.filter(s => s.departmentId === dept.id || s.departmentName === dept.name);
    const deptScores = deptSessions.map(s => s.responses.find(r => r.questionId === 37)?.score).filter((s): s is 1|2|3|4 => s !== undefined);
    const aff = deptScores.filter(s => s <= 2).length;
    const rate = deptScores.length > 0 ? Number(((aff / deptScores.length) * 100).toFixed(1)) : 0;
    const status: FavorabilityLevel = rate > 25 ? 'critical' : rate >= 10 ? 'warning' : 'favorable';

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      rate,
      affectedCount: aff,
      totalDept: deptSessions.length || (dept.headcount || 1),
      status
    };
  });

  const moralHarassmentStats: ConductIndicatorStats = {
    title: 'Assédio Moral no Trabalho',
    dimension: 'Segurança Psicológica e Ética',
    overallRate: moralRate,
    frequentRate: moralFrequentRate,
    overallAffectedCount: moralAffectedCount,
    totalParticipants: evaluatedEmployees,
    status: moralStatus,
    distribution: {
      nunca: q37Scores.filter(s => s === 4).length,
      raramente: q37Scores.filter(s => s === 3).length,
      asVezes: q37Scores.filter(s => s === 2).length,
      frequente: q37Scores.filter(s => s === 1).length,
      sempre: 0
    },
    departmentStats: moralDeptStats,
    interpretiveNotes: moralRate > 25 
      ? `O indicador de condutas abusivas/assédio moral na ${company.tradeName} atingiu nível crítico (${moralRate}% de relatos). Requer investigação pericial, canal anônimo e ações imediatas no PGR.`
      : moralRate >= 10
      ? `O indicador de assédio moral na ${company.tradeName} encontra-se em nível de atenção (${moralRate}% de relatos), exigindo capacitação de liderança e fortalecimento de canais de diálogo.`
      : `O indicador de assédio moral na ${company.tradeName} encontra-se em patamar favorável (${moralRate}% de relatos), demonstrando clima de respeito e convivência ética.`
  };

  // 4.3 Sexual Harassment (Q38: "No meu ambiente de trabalho NÃO presenciei nem vivenciei condutas inadequadas ou assédio de natureza sexual.")
  // Disagreeing (score 1 or 2) implies occurrence/witnessing
  const q38Scores = companySessions.map(s => s.responses.find(r => r.questionId === 38)?.score).filter((s): s is 1|2|3|4 => s !== undefined);
  const sexualAffectedCount = q38Scores.filter(s => s <= 2).length;
  const sexualRate = q38Scores.length > 0 ? Number(((sexualAffectedCount / q38Scores.length) * 100).toFixed(1)) : 0;
  const sexualFrequentRate = q38Scores.length > 0 ? Number(((q38Scores.filter(s => s === 1).length / q38Scores.length) * 100).toFixed(1)) : 0;
  const sexualStatus: FavorabilityLevel = sexualRate > 10 ? 'critical' : sexualRate >= 3 ? 'warning' : 'favorable';

  const sexualDeptStats = depts.map(dept => {
    const deptSessions = companySessions.filter(s => s.departmentId === dept.id || s.departmentName === dept.name);
    const deptScores = deptSessions.map(s => s.responses.find(r => r.questionId === 38)?.score).filter((s): s is 1|2|3|4 => s !== undefined);
    const aff = deptScores.filter(s => s <= 2).length;
    const rate = deptScores.length > 0 ? Number(((aff / deptScores.length) * 100).toFixed(1)) : 0;
    const status: FavorabilityLevel = rate > 10 ? 'critical' : rate >= 3 ? 'warning' : 'favorable';

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      rate,
      affectedCount: aff,
      totalDept: deptSessions.length || (dept.headcount || 1),
      status
    };
  });

  const sexualHarassmentStats: ConductIndicatorStats = {
    title: 'Assédio Sexual no Trabalho',
    dimension: 'Segurança Psicológica e Ética',
    overallRate: sexualRate,
    frequentRate: sexualFrequentRate,
    overallAffectedCount: sexualAffectedCount,
    totalParticipants: evaluatedEmployees,
    status: sexualStatus,
    distribution: {
      nunca: q38Scores.filter(s => s === 4).length,
      raramente: q38Scores.filter(s => s === 3).length,
      asVezes: q38Scores.filter(s => s === 2).length,
      frequente: q38Scores.filter(s => s === 1).length,
      sempre: 0
    },
    departmentStats: sexualDeptStats,
    interpretiveNotes: sexualRate > 10
      ? `O assédio sexual registrou índice crítico (${sexualRate}% no geral em ${company.tradeName}). Exige acolhimento com sigilo absoluto, medidas disciplinares e palestras nos termos da Lei nº 14.457/2022.`
      : sexualRate >= 3
      ? `O assédio sexual registrou nível de atenção (${sexualRate}% no geral em ${company.tradeName}). Recomenda-se reforço das políticas de integridade e canais de denúncia.`
      : `O indicador de prevenção ao assédio sexual registrou patamar favorável (${sexualRate}% de relatos), evidenciando conformidade com as diretrizes da CIPA e Lei nº 14.457/2022.`
  };

  // 5. Ranking of Worst Questions (Ranking de Atenção)
  const sortedWorst = [...allItemStats]
    .sort((a, b) => a.favorabilityIndex - b.favorabilityIndex)
    .slice(0, 8);

  const worstQuestions: CriticalItem[] = sortedWorst.map(item => ({
    questionId: item.questionId,
    text: item.text,
    dimensionName: item.dimensionName,
    averageScore: item.avgScore,
    favorabilityIndex: item.favorabilityIndex,
    disagreementRate: item.disagreementRate,
    stronglyDisagreeRate: item.stronglyDisagreeRate,
    disagreeRate: item.disagreeRate,
    agreeRate: item.agreeRate,
    stronglyAgreeRate: item.stronglyAgreeRate
  }));

  const criticalItems: CriticalItem[] = worstQuestions.slice(0, 3);

  // 6. Synthesis Text & Technical Conclusion
  const lowestDims = [...dimensionScores].sort((a, b) => a.favorabilityIndex - b.favorabilityIndex);
  const lowestDepts = [...departmentScores].sort((a, b) => a.favorabilityIndex - b.favorabilityIndex);

  const synthesisText = `O diagnóstico psicossocial da empresa ${company.tradeName} (${company.corporateName}), com amostragem de ${evaluatedEmployees} respondentes (${adherenceRate}% do quadro ativo), apresentou Índice Global de Favorabilidade de ${overallFavorability} pts, classificado como ${overallClassif.label}. ` +
    `Entre as 6 dimensões do instrumento HSE-IT, os melhores desempenhos foram observados em "${lowestDims[lowestDims.length - 1]?.dimensionName}" (${lowestDims[lowestDims.length - 1]?.favorabilityIndex} pts) e "${lowestDims[lowestDims.length - 2]?.dimensionName}" (${lowestDims[lowestDims.length - 2]?.favorabilityIndex} pts). ` +
    `Por outro lado, as dimensões que demandam maior atenção preventiva são "${lowestDims[0]?.dimensionName}" (${lowestDims[0]?.favorabilityIndex} pts) e "${lowestDims[1]?.dimensionName}" (${lowestDims[1]?.favorabilityIndex} pts). ` +
    (lowestDepts.length > 0 ? `Na análise setorial, o setor de ${lowestDepts[0]?.departmentName} apresentou o índice de favorabilidade mais desafiador (${lowestDepts[0]?.favorabilityIndex} pts). ` : '') +
    `Nos indicadores de conduta, o índice de percepção de estabilidade no emprego atingiu ${stabilityOverallFav} pts, enquanto os relatos de condutas relacionadas a assédio moral e assédio sexual registraram ${moralRate}% e ${sexualRate}%, respectivamente.`;

  const technicalConclusion = `Os resultados deste diagnóstico técnico psicossocial fornecem subsídios periciais objetivos para a estruturação do Plano de Ação da empresa ${company.tradeName}, em conformidade com as exigências da NR-1 e da Portaria MTE nº 1.419/2024, integrando as medidas preventivas ao Programa de Gerenciamento de Riscos (PGR). Recomenda-se a reavaliação periódica no ciclo ${company.referenceYear || '2026/2027'} para monitoramento contínuo da eficácia.`;

  const actionPlanRecommendations = [
    {
      action: 'Abertura e Fortalecimento de Canal de Denúncias Seguro, Sigiloso e Independente (Prevenção e Acolhimento a Assédio Moral e Sexual).',
      dimension: 'Segurança Psicológica e Ética',
      responsible: 'Comitê de Ética / RH / SESMT',
      deadline: '30 dias',
      indicator: '100% dos colaboradores cientes dos canais seguros'
    },
    {
      action: `Capacitação e Treinamento de Lideranças para as equipes de ${lowestDepts.slice(0, 2).map(d => d.departmentName).join(' e ')}.`,
      dimension: 'Liderança',
      responsible: 'Psicologia Ocupacional / RH',
      deadline: '45 dias',
      indicator: 'Participação de 100% dos líderes de setor'
    },
    {
      action: `Revisão dos Processos e Ritmo de Trabalho para a dimensão "${lowestDims[0]?.dimensionName}".`,
      dimension: lowestDims[0]?.dimensionName || 'Autonomia e Controle',
      responsible: 'Gestão Operacional & Ergonomia / SESMT',
      deadline: '60 dias',
      indicator: 'Elevação do índice de favorabilidade para >= 70 pts'
    },
    {
      action: 'Estruturação de Programa de Feedback Periódico e Reconhecimento Profissional.',
      dimension: 'Liderança',
      responsible: 'RH & Lideranças Operacionais',
      deadline: '60 dias',
      indicator: 'Favorabilidade dos itens de feedback superior a 75 pts'
    },
    {
      action: 'Ações Contínuas de Promoção da Saúde Mental, Clima Colaborativo e Gestão do Estresse.',
      dimension: 'Saúde Mental e Equilíbrio',
      responsible: 'Psicologia Ocupacional / CIPA',
      deadline: '90 dias',
      indicator: 'Participação mínima de 85% do quadro ativo'
    },
    {
      action: 'Reavaliação Periódica e Monitoramento Contínuo no Inventário de Riscos do PGR.',
      dimension: 'Organização do Trabalho',
      responsible: 'SESMT & Médico Coordenador PCMSO',
      deadline: 'Anual (Ciclo Regulatório)',
      indicator: 'Reemissão do Laudo Técnico NR-1'
    }
  ];

  return {
    companyId: company.id,
    companyName: company.tradeName || company.corporateName,
    corporateName: company.corporateName || company.tradeName,
    cnpj: company.cnpj,
    cnae: company.cnae || 'Não informado',
    economicActivity: company.economicActivity || company.segment || 'Atividade Econômica Geral',
    riskDegree: company.riskDegree || 2,
    unit: company.unit || (company.city ? `${company.unit || 'Matriz'} - ${company.city}/${company.state || ''}` : 'Unidade Principal'),
    referenceYear: company.referenceYear || '2025/2026',
    applicationPeriod: company.applicationPeriod || `${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
    technicalReference: company.technicalReference || 'NR-1 e Portaria MTE nº 1.419/2024',
    technicalTeam: 'Psicologia Ocupacional & Engenharia de Segurança do Trabalho',
    campaignTitle: company.campaigns?.[0]?.title || `Censo de Riscos Psicossociais NR-01 - ${company.tradeName}`,
    evaluatedDate: company.lastAssessment || new Date().toLocaleDateString('pt-BR'),
    totalEmployees,
    evaluatedEmployees,
    unansweredEmployees,
    unansweredRate,
    adherenceRate,
    overallScore,
    overallFavorability,
    overallRiskLevel: overallClassif.riskLevel,
    overallFavorabilityLevel: overallClassif.level,
    dimensionScores,
    departmentScores,
    criticalItems,
    worstQuestions,
    stabilityStats,
    moralHarassmentStats,
    sexualHarassmentStats,
    allItemStats,
    synthesisText,
    technicalConclusion,
    actionPlanRecommendations
  };
}

export function generateRemainingSessionsForCompany(company: Company, existingSessions: AssessmentSession[]): AssessmentSession[] {
  const companyExisting = existingSessions.filter(s => s.companyId === company.id);
  const depts = company.departments && company.departments.length > 0
    ? company.departments
    : [{ id: 'dp-geral', companyId: company.id, name: 'Geral', roles: ['Colaborador'], headcount: company.employeeCount || 10 }];

  const newSessions: AssessmentSession[] = [];

  depts.forEach(dept => {
    const existingInDept = companyExisting.filter(s => s.departmentId === dept.id || s.departmentName === dept.name).length;
    const required = Number(dept.headcount) || 1;
    const needed = Math.max(0, required - existingInDept);

    for (let i = 0; i < needed; i++) {
      const role = dept.roles && dept.roles.length > 0
        ? dept.roles[i % dept.roles.length]
        : 'Colaborador';

      const responses = QUESTIONS.map(q => {
        // Skew towards realistic distribution with slight variations
        const rand = Math.random();
        let score: 1 | 2 | 3 | 4 = 3;
        if (q.id === 37 || q.id === 38) {
          // Bullying/Harassment questions: mostly 4 (nunca) with small % of 1 or 2
          score = rand < 0.08 ? 1 : rand < 0.18 ? 2 : rand < 0.4 ? 3 : 4;
        } else if (q.dimensionId === 'dim-aut') {
          score = rand < 0.12 ? 1 : rand < 0.28 ? 2 : rand < 0.65 ? 3 : 4;
        } else {
          score = rand < 0.08 ? 1 : rand < 0.2 ? 2 : rand < 0.6 ? 3 : 4;
        }
        return { questionId: q.id, score };
      });

      newSessions.push({
        id: `sim-${company.id}-${dept.id}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: company.id,
        departmentId: dept.id,
        departmentName: dept.name,
        roleName: role,
        employeeIdentifier: `COLAB-SIM-${dept.name.substring(0, 3).toUpperCase()}-${existingInDept + i + 1}`,
        isAnonymous: true,
        tenureYears: Math.floor(Math.random() * 6) + 1,
        workShift: 'Integral',
        responses,
        createdAt: new Date().toISOString()
      });
    }
  });

  return newSessions;
}
