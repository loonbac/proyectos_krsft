/**
 * LeadFilesSection — Sección de archivos adjuntos para leads del pipeline.
 * Permite subir, descargar, ver y eliminar archivos asociados a un lead.
 * Con botón de confirmación, miniaturas y modal visualizador.
 *
 * @param {{
 *   files: Array,
 *   isClosed: boolean,
 *   onUpload: (files: File[], category: string) => Promise<boolean>,
 *   onDelete: (fileId: number) => Promise<boolean>,
 *   getDownloadUrl: (fileId: number) => string,
 * }} props
 */
import { memo, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import {
  PaperClipIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  TableCellsIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import FileViewerModal from './modals/FileViewerModal';

// ── Helpers ──────────────────────────────────────────────────────────

const FILE_CATEGORIES = [
  { value: 'general',      label: 'General' },
  { value: 'plano',        label: 'Plano' },
  { value: 'presupuesto',  label: 'Presupuesto' },
  { value: 'contrato',     label: 'Contrato' },
  { value: 'foto',         label: 'Foto' },
  { value: 'otro',         label: 'Otro' },
];

const CATEGORY_BADGE = {
  general:      'gray',
  plano:        'blue',
  presupuesto:  'amber',
  contrato:     'emerald',
  foto:         'purple',
  otro:         'cyan',
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

const getFileIcon = (mimeType) => {
  if (!mimeType) return DocumentIcon;
  if (mimeType.startsWith('image/')) return PhotoIcon;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return TableCellsIcon;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return DocumentTextIcon;
  return DocumentIcon;
};

const getFileIconColor = (mimeType) => {
  if (!mimeType) return 'text-gray-400 bg-gray-100';
  if (mimeType.startsWith('image/')) return 'text-purple-500 bg-purple-50';
  if (mimeType.includes('pdf')) return 'text-red-500 bg-red-50';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-emerald-500 bg-emerald-50';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-500 bg-blue-50';
  return 'text-gray-400 bg-gray-100';
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Component ────────────────────────────────────────────────────────

function LeadFilesSection({ files = [], isClosed = false, onUpload, onDelete, getDownloadUrl }) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('general');
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const inputRef = useRef(null);

  const getFilePreview = useCallback((file) => {
    if (file.type?.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  const handleFiles = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const oversized = filesArray.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      const fileList = oversized.map((f) => `${f.name} (${formatFileSize(f.size)})`).join(', ');
      alert(`Los siguientes archivos exceden el límite de 10 MB:\n${fileList}`);
      return;
    }
    setPreviewFiles((prev) => [...prev, ...filesArray]);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (previewFiles.length === 0) return;
    setUploading(true);
    await onUpload(previewFiles, category);
    setUploading(false);
    setPreviewFiles([]);
  }, [previewFiles, category, onUpload]);

  const removePreviewFile = useCallback((index) => {
    setPreviewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllPreviews = useCallback(() => {
    setPreviewFiles([]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDeleteFile = useCallback(async (fileId) => {
    setDeletingId(fileId);
    await onDelete(fileId);
    setDeletingId(null);
  }, [onDelete]);

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <PaperClipIcon className="size-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-700">Archivos Adjuntos</h3>
          <Badge variant="gray" className="text-[10px]">{files.length + previewFiles.length}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!isClosed && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500">Categoría:</span>
              {FILE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={clsx(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors border',
                    category === cat.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className={clsx(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <>
                  <svg className="size-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Subiendo archivos...</p>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="size-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-600">
                    Arrastra archivos aquí o <span className="text-primary">haz clic para seleccionar</span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">Máx. 10 MB por archivo</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                accept=".pdf,.doc,.docx,.docm,.xls,.xlsx,.xlsm,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.dwg,.dxf,.zip,.rar,.7z,.txt"
              />
            </div>
          </div>
        )}

        {previewFiles.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-amber-900">Pendientes de subida ({previewFiles.length})</h4>
              <button onClick={clearAllPreviews} className="text-xs font-medium text-amber-700 hover:text-amber-900">Limpiar</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
              {previewFiles.map((file, idx) => {
                const preview = getFilePreview(file);
                const Icon = getFileIcon(file.type);
                const iconColor = getFileIconColor(file.type);
                return (
                  <div key={idx} className="relative rounded-lg border border-amber-200 bg-white overflow-hidden group aspect-square">
                    {preview ? (
                      <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={clsx('w-full h-full flex items-center justify-center', iconColor)}>
                        <Icon className="size-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <p className="text-xs font-medium text-white px-1 truncate text-center">{file.name}</p>
                      <button
                        onClick={() => removePreviewFile(idx)}
                        className="rounded-full p-1 bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                      >
                        <XMarkIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleConfirmUpload} disabled={uploading}>
                Confirmar subida ({previewFiles.length})
              </Button>
              <button
                onClick={clearAllPreviews}
                disabled={uploading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {files.length === 0 && previewFiles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Sin archivos adjuntos</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.mime_type);
              const iconColor = getFileIconColor(file.mime_type);
              const isDeleting = deletingId === file.id;
              const fileObj = { ...file, mime_type: file.mime_type || 'application/octet-stream' };

              return (
                <div key={file.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 group hover:bg-gray-100/80">
                  {file.mime_type?.startsWith('image/') ? (
                    <img src={getDownloadUrl(file.id)} alt={file.original_name} className="size-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className={clsx('inline-flex size-9 items-center justify-center rounded-lg shrink-0', iconColor)}>
                      <Icon className="size-4.5" />
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{file.original_name}</span>
                      <Badge variant={CATEGORY_BADGE[file.category] || 'gray'} className="text-[10px] shrink-0">
                        {FILE_CATEGORIES.find(c => c.value === file.category)?.label || file.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      {file.uploaded_by_name && <span>Por: {file.uploaded_by_name}</span>}
                      <span>{formatDate(file.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingFile(fileObj)}
                      className="rounded p-1.5 bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                      title="Ver archivo"
                    >
                      <EyeIcon className="size-4" />
                    </button>
                    <a href={getDownloadUrl(file.id)} className="rounded p-1.5 bg-blue-500 hover:bg-blue-600 text-white transition-colors" title="Descargar">
                      <ArrowDownTrayIcon className="size-4" />
                    </a>
                    {!isClosed && (
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={isDeleting}
                        className={clsx('rounded p-1.5 transition-colors', isDeleting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white')}
                        title="Eliminar"
                      >
                        {isDeleting ? (
                          <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <TrashIcon className="size-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FileViewerModal
        isOpen={!!viewingFile}
        file={viewingFile}
        getDownloadUrl={getDownloadUrl}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}

export default memo(LeadFilesSection);
