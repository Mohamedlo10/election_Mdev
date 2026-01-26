'use client';

import { FileSpreadsheet, ArrowRight, CheckCircle } from 'lucide-react';
import Modal from './Modal';

interface ImportHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportHelpModal({ isOpen, onClose }: ImportHelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Guide d'import des votants" size="lg">
      <div className="space-y-6">
        {/* Introduction */}
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

        {/* Cas 1: Email uniquement */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">1</span>
              Format avec email uniquement
            </h4>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">
              Si vous n&apos;avez qu&apos;une colonne avec les emails, le nom sera automatiquement extrait de l&apos;adresse email.
            </p>

            {/* Illustration tableau */}
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-2 text-gray-600">jean.dupont@exemple.com</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">marie_martin@exemple.com</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Résultat */}
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Résultat :</span> Jean Dupont, Marie Martin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cas 2: Nom + Email */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">2</span>
              Format avec nom et email
            </h4>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">
              Le format classique avec le nom complet dans la première colonne et l&apos;email dans la seconde.
            </p>

            {/* Illustration tableau */}
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      nom
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-2 text-gray-600">Jean Dupont</td>
                    <td className="px-4 py-2 text-gray-600">jean@exemple.com</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Marie Martin</td>
                    <td className="px-4 py-2 text-gray-600">marie@exemple.com</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Format recommandé</span>
            </div>
          </div>
        </div>

        {/* Cas 3: Prénom + Nom + Email */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">3</span>
              Format avec prénom, nom et email
            </h4>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">
              Si vos données sont séparées en prénom et nom, ils seront automatiquement combinés.
            </p>

            {/* Illustration tableau */}
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      prénom
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      nom
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-300">
                      email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-2 text-gray-600">Jean</td>
                    <td className="px-4 py-2 text-gray-600">Dupont</td>
                    <td className="px-4 py-2 text-gray-600">jean@exemple.com</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Marie</td>
                    <td className="px-4 py-2 text-gray-600">Martin</td>
                    <td className="px-4 py-2 text-gray-600">marie@exemple.com</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Résultat */}
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Résultat :</span> Prénom et nom combinés automatiquement
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes importantes */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-900 mb-2">Notes importantes</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• La première ligne est considérée comme l&apos;en-tête et sera ignorée</li>
            <li>• Les emails en double seront signalés comme erreurs</li>
            <li>• Les lignes vides ou sans email valide seront ignorées</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
