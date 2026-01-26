'use client';

import { User, FileText, MoreVertical, Edit, Trash2, Lock } from 'lucide-react';
import { Card, CardContent } from './Card';
import Badge from './Badge';

interface CandidateCardProps {
  candidate: {
    id: string;
    full_name: string;
    photo_url: string | null;
    description: string | null;
    program_url: string | null;
    category_id: string;
  };
  categoryName?: string;
  categoryColor?: string;
  showActions?: boolean;
  canModify?: boolean;
  isMenuOpen?: boolean;
  onMenuToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CandidateCard({
  candidate,
  categoryName,
  categoryColor,
  showActions = true,
  canModify = true,
  isMenuOpen = false,
  onMenuToggle,
  onEdit,
  onDelete,
}: CandidateCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Photo section with gradient overlay */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
          {candidate.photo_url ? (
            <img
              src={candidate.photo_url}
              alt={candidate.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-24 h-24 bg-white/80 rounded-full flex items-center justify-center shadow-inner">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-bold text-white text-lg drop-shadow-md truncate">
              {candidate.full_name}
            </h3>
          </div>

          {/* Actions menu */}
          {showActions && (
            <div className="absolute top-3 right-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle?.();
                }}
                className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 shadow-md transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20">
                  <button
                    onClick={() => canModify && onEdit?.()}
                    disabled={!canModify}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm ${
                      canModify
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canModify ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    Modifier
                  </button>
                  <button
                    onClick={() => canModify && onDelete?.()}
                    disabled={!canModify}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm ${
                      canModify
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canModify ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="p-4 space-y-3">
          {/* Category badge */}
          {categoryName && (
            <Badge
              size="sm"
              style={categoryColor ? {
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
                borderColor: categoryColor
              } : undefined}
            >
              {categoryName}
            </Badge>
          )}

          {/* Description */}
          {candidate.description ? (
            <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
              {candidate.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic min-h-[2.5rem]">
              Aucune description
            </p>
          )}

          {/* Program link */}
          {candidate.program_url && (
            <a
              href={candidate.program_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-theme-primary hover:text-theme-primary-dark transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-4 h-4" />
              Voir le programme
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
