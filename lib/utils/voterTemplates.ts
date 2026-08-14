import * as XLSX from 'xlsx';

/**
 * Modèles de fichiers d'import des votants.
 * Les trois formats correspondent exactement à ceux reconnus par `parseRowData`
 * (lib/services/voter.service.ts), qui identifie les colonnes par position :
 * les en-têtes ne servent qu'à guider l'utilisateur.
 */
export type VoterTemplateId = 'email' | 'name_email' | 'firstname_lastname_email';

export interface VoterTemplate {
  id: VoterTemplateId;
  label: string;
  description: string;
  columns: string[];
  rows: string[][];
  fileName: string;
  recommended?: boolean;
}

export const VOTER_TEMPLATES: VoterTemplate[] = [
  {
    id: 'email',
    label: 'Email uniquement',
    description: 'Le nom est déduit automatiquement de l\'adresse email.',
    columns: ['email'],
    rows: [['jean.dupont@exemple.com'], ['marie_martin@exemple.com']],
    fileName: 'modele_votants_email.xlsx',
  },
  {
    id: 'name_email',
    label: 'Nom et email',
    description: 'Nom complet en première colonne, email en seconde.',
    columns: ['nom', 'email'],
    rows: [
      ['Jean Dupont', 'jean@exemple.com'],
      ['Marie Martin', 'marie@exemple.com'],
    ],
    fileName: 'modele_votants_nom_email.xlsx',
    recommended: true,
  },
  {
    id: 'firstname_lastname_email',
    label: 'Prénom, nom et email',
    description: 'Prénom et nom sont combinés automatiquement.',
    columns: ['prénom', 'nom', 'email'],
    rows: [
      ['Jean', 'Dupont', 'jean@exemple.com'],
      ['Marie', 'Martin', 'marie@exemple.com'],
    ],
    fileName: 'modele_votants_prenom_nom_email.xlsx',
  },
];

/** Génère et télécharge le modèle Excel correspondant. */
export function downloadVoterTemplate(id: VoterTemplateId) {
  const template = VOTER_TEMPLATES.find((t) => t.id === id);
  if (!template) return;

  const worksheet = XLSX.utils.aoa_to_sheet([template.columns, ...template.rows]);
  worksheet['!cols'] = template.columns.map(() => ({ wch: 26 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Votants');
  XLSX.writeFile(workbook, template.fileName);
}

/** Extensions acceptées par l'import. */
export const ACCEPTED_IMPORT_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export function isAcceptedImportFile(fileName: string): boolean {
  return ACCEPTED_IMPORT_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}
