'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, X, Video, CheckCircle2, Loader2, FileVideo } from 'lucide-react';
import type { VideoFile } from '@/types';

interface MediaUploaderProps {
  /** Вызывается, когда видео готово к отправке */
  onVideoReady: (file: File | null) => void;
  maxSizeMB?: number;
  isUploading?: boolean;
}

/**
 * Загрузчик видеофайлов (Video-Only).
 * Поддерживает: MP4, MOV.
 */
export default function MediaUploader({
  onVideoReady,
  maxSizeMB = 100,
  isUploading = false,
}: MediaUploaderProps) {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError('');
      const file = acceptedFiles[0];
      if (!file) return;

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        setError(`Файл слишком большой (${sizeMB.toFixed(1)}МБ). Максимум ${maxSizeMB}МБ`);
        return;
      }

      const vf: VideoFile = {
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
      };
      setVideoFile(vf);
      onVideoReady(file);
    },
    [maxSizeMB, onVideoReady]
  );

  const removeFile = () => {
    setVideoFile(null);
    onVideoReady(null);
    setError('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    disabled: isUploading,
    onDrop,
  });

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} МБ` : `${(bytes / 1024).toFixed(0)} КБ`;
  };

  return (
    <div className="space-y-4">
      {/* Дропзона */}
      {!videoFile && (
        <div
          {...getRootProps()}
          className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 dropzone-glow ${
            isDragActive
              ? 'border-cyan-400 bg-cyan-500/5 dropzone-glow-active'
              : 'border-cyan-500/30 bg-white/[0.02] hover:border-cyan-500/50 hover:bg-white/[0.04]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              isDragActive ? 'bg-cyan-500/20' : 'bg-cyan-500/10'
            }`}>
              <CloudUpload className={`w-8 h-8 transition-colors ${
                isDragActive ? 'text-cyan-300' : 'text-cyan-400'
              }`} />
            </div>
            <div>
              <p className="text-base font-medium text-white/80">
                Перетащите видео сюда или нажмите для выбора
              </p>
              <p className="text-sm text-white/40 mt-1.5">
                MP4, MOV • Макс. {maxSizeMB}МБ на файл
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Загруженный файл */}
      <AnimatePresence>
        {videoFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 space-y-3"
          >
            {/* File info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                <FileVideo className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{videoFile.name}</p>
                <p className="text-xs text-white/40">{formatSize(videoFile.size)}</p>
              </div>
              {!isUploading && (
                <button
                  onClick={removeFile}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/40 hover:text-red-400" />
                </button>
              )}
            </div>

            {/* Processing steps (when uploading) */}
            {isUploading && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <ProcessingStep label="Загрузка в облако" status="active" />
                <ProcessingStep label="Извлечение кадров" status="pending" />
                <ProcessingStep label="AI-анализ видео" status="pending" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProcessingStep({
  label,
  status,
}: {
  label: string;
  status: 'done' | 'active' | 'pending';
}) {
  return (
    <div className="flex items-center gap-2.5">
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
      {status === 'active' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
      {status === 'pending' && (
        <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
      )}
      <span className={`text-sm ${
        status === 'done' ? 'text-cyan-400' :
        status === 'active' ? 'text-white/80' :
        'text-white/30'
      }`}>
        {label}
      </span>
    </div>
  );
}
