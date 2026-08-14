'use client';

import { useRef, useState } from 'react';
import {
  FileSpreadsheet, ArrowRight, CheckCircle, Upload,
  Download, BookOpen, AlertCircle,
} from 'lucide-react';
import Modal from './Modal';
import {
  VOTER_TEMPLATES, downloadVoterTemplate, isAcceptedImportFile,
  ACCEPTED_IMPORT_EXTENSIONS,
} from '@/lib/utils/voterTemplates';

type TabId = 'import' | 'info';

interface ImportVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé avec le fichier choisi (glisser-déposer ou sélection) */
  onFileSelected: (file: File) => void;
  /** Onglet ouvert par défaut : 'import' depuis le bouton Importer, 'info' depuis l'aide */
  defaultTab?: TabId;
}

export default function ImportVotersModal({
  isOpen,
  onClose,
  onFileSelected,
  defaultTab = 'import',
}: ImportVotersModalProps) {
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [wasOpen, setWasOpen] = useState(isOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialisation à l'ouverture, ajustée pendant le rendu plutôt que dans un
  // effet : pas de rendu en cascade ni d'affichage transitoire du mauvais onglet.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTab(defaultTab);
      setFileError('');
      setIsDragging(false);
    }
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImportFile(file.name)) {
      setFileError(`Format non reconnu. Formats acceptés : ${ACCEPTED_IMPORT_EXTENSIONS.join(', ')}`);
      return;
    }
    setFileError('');
    onFileSelected(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importer des votants" size="lg">
      {/* Bascule Import / Guide */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-5">
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'import'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          Importer un fichier
        </button>
        <button
          type="button"
          onClick={() => setTab('info')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'info'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Guide des formats
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-1 pb-2">
        {tab === 'import' ? (
          <ImportTab
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            fileError={fileError}
            fileInputRef={fileInputRef}
            onFile={handleFile}
          />
        ) : (
          <FormatGuide />
        )}
      </div>
    </Modal>
  );
}

// ─── Onglet Import ──────────────────────────────────────────────────────────

function ImportTab({
  isDragging,
  setIsDragging,
  fileError,
  fileInputRef,
  onFile,
}: {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  fileError: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-theme-primary bg-theme-primary-lighter'
            : 'border-gray-300 hover:border-theme-primary hover:bg-gray-50'
        }`}
      >
        <div className="w-14 h-14 bg-theme-primary-lighter rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-7 h-7 text-theme-primary" />
        </div>
        <p className="font-medium text-gray-900">
          Glissez votre fichier ici ou cliquez pour le choisir
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Fichiers Excel (.xlsx, .xls) ou CSV (.csv)
        </p>

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {fileError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{fileError}</p>
        </div>
      )}

      {/* Modèles téléchargeables */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">
          Vous n&apos;avez pas encore de fichier ?
        </h4>
        <p className="text-sm text-gray-500 mb-3">
          Téléchargez l&apos;un des trois modèles acceptés, complétez-le puis importez-le.
        </p>

        <div className="space-y-2">
          {VOTER_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{template.label}</span>
                  {template.recommended && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Recommandé
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{template.description}</p>
              </div>
              <button
                type="button"
                onClick={() => downloadVoterTemplate(template.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2 text-sm">Notes importantes</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• La première ligne est considérée comme l&apos;en-tête et sera ignorée</li>
          <li>• Les emails en double seront signalés comme erreurs</li>
          <li>• Les lignes vides ou sans email valide seront ignorées</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Onglet Guide ───────────────────────────────────────────────────────────

function TemplateTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-x-auto mb-3">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? 'border-b border-gray-200' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-gray-600 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const GUIDE_RESULTS: Record<string, string> = {
  email: 'Jean Dupont, Marie Martin',
  firstname_lastname_email: 'Prénom et nom combinés automatiquement',
};

function FormatGuide() {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Formats acceptés</h3>
            <p className="text-sm text-blue-700 mt-1">
              Fichiers Excel (.xlsx, .xls) ou CSV (.csv)
            </p>
          </div>
        </div>
      </div>

      {VOTER_TEMPLATES.map((template, index) => (
        <div key={template.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                {index + 1}
              </span>
              Format avec {template.columns.join(', ')}
            </h4>
            <button
              type="button"
              onClick={() => downloadVoterTemplate(template.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Modèle
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            <TemplateTable columns={template.columns} rows={template.rows} />

            {GUIDE_RESULTS[template.id] ? (
              <div className="flex items-center gap-3">
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Résultat :</span> {GUIDE_RESULTS[template.id]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Format recommandé</span>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Notes importantes</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• La première ligne est considérée comme l&apos;en-tête et sera ignorée</li>
          <li>• Les emails en double seront signalés comme erreurs</li>
          <li>• Les lignes vides ou sans email valide seront ignorées</li>
        </ul>
      </div>
    </div>
  );
}
