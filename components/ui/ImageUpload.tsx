'use client';

import { useRef, useState } from 'react';
import { Upload, X, User, Image as ImageIcon, Loader2 } from 'lucide-react';
import Button from './Button';
import { compressImage, formatFileSize } from '@/lib/utils/imageCompression';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  label?: string;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fallbackIcon?: 'user' | 'image';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function ImageUpload({
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  label,
  shape = 'circle',
  size = 'md',
  disabled = false,
  fallbackIcon = 'user',
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

  const displayUrl = previewUrl || currentImageUrl;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    setCompressing(true);
    setCompressionInfo(null);

    try {
      const originalSize = file.size;
      const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
      const newSize = compressedFile.size;

      // Show compression info
      if (newSize < originalSize) {
        const saved = Math.round((1 - newSize / originalSize) * 100);
        setCompressionInfo(`Compressé: ${formatFileSize(originalSize)} → ${formatFileSize(newSize)} (-${saved}%)`);
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(compressedFile);

      onImageSelect(compressedFile);
    } catch (error) {
      console.error('Erreur de compression:', error);
      // Fallback: use original file
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    } finally {
      setCompressing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const FallbackIcon = fallbackIcon === 'user' ? User : ImageIcon;

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="relative">
        {/* Image container */}
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            ${sizeClasses[size]}
            ${shapeClass}
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            ${dragOver ? 'ring-2 ring-theme-primary ring-offset-2' : ''}
            overflow-hidden border-2 border-dashed border-gray-300
            hover:border-theme-primary transition-colors
            flex items-center justify-center bg-gray-50
          `}
        >
          {compressing ? (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Loader2 className={`${iconSizes[size]} animate-spin`} />
            </div>
          ) : displayUrl ? (
            <img
              src={displayUrl}
              alt="Preview"
              className={`w-full h-full object-cover ${shapeClass}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <FallbackIcon className={iconSizes[size]} />
            </div>
          )}
        </div>

        {/* Remove button */}
        {displayUrl && !disabled && onImageRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload button */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={compressing}
        >
          {compressing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Compression...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {displayUrl ? 'Changer' : 'Choisir une image'}
            </>
          )}
        </Button>
      )}

      {/* Compression info */}
      {compressionInfo && (
        <p className="text-xs text-green-600">{compressionInfo}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
