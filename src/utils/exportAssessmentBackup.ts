import { AssessmentData } from '../services/assessmentSnapshotService';

/**
 * RF10: Dispara o download de um arquivo .json seguro com metadados para auditoria/jurídico
 */
export function exportAssessmentBackup(data: AssessmentData, customFilename?: string): void {
  try {
    const exportPayload = {
      complianceStandard: 'NR-01 & Portaria MTE nº 1.419/2024 & ISO 45003',
      system: 'PsychoRisk Analytics',
      exportedAt: new Date().toISOString(),
      metadata: {
        assessmentId: data.id,
        status: data.status,
        company: {
          id: data.companyId,
          name: data.companyName,
          cnpj: data.companyCnpj || 'Não Informado',
          department: data.departmentName,
          sampleSize: data.sampleSize,
        },
        evaluator: {
          name: data.evaluatorName,
          email: data.evaluatorEmail,
        },
        diagnostics: {
          overallFavorabilityRate: `${Number(data.overallFavorabilityRate).toFixed(2)}%`,
          riskLevel: data.riskLevel,
          categoryAverages: data.categoryAverages,
        },
      },
      conductRisks: data.conductRisks,
      // Resumo consolidado de respostas
      rawResponsesSnapshot: data.rawResponses,
      // Respostas individuais de cada participante/sessão coletada
      individualParticipantsCount: data.individualParticipantSessions?.length || (Object.keys(data.rawResponses).length > 0 ? 1 : 0),
      individualParticipantSessions: data.individualParticipantSessions || (Object.keys(data.rawResponses).length > 0 ? [{
        participantId: 'sessao_individual_coletada',
        department: data.departmentName,
        answers: data.rawResponses,
        timestamp: data.createdAt
      }] : []),
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const safeCompanyName = (data.companyName || 'empresa').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const safeDeptName = (data.departmentName || 'geral').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const dateFormatted = new Date().toISOString().split('T')[0];

    const defaultFilename = `backup_laudo_${safeCompanyName}_${safeDeptName}_${dateFormatted}.json`;
    const finalFilename = customFilename || defaultFilename;

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Falha ao exportar backup JSON:', error);
    throw new Error('Não foi possível gerar o arquivo de backup.');
  }
}
