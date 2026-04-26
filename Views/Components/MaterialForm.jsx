import { memo } from 'react';
import {
  DocumentPlusIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';

/**
 * MaterialForm – Material specification form + import/download buttons (detail view).
 */
function MaterialForm({
  materialForm,
  onFormChange,
  nextItemNumber,
  savingOrder,
  onCreateOrder,
  importingFile,
  onDownloadTemplate,
  onImportExcel,
  // Metadata from last import (optional)
  lastImportMetadata,
}) {
  const handleChange = (field) => (e) => {
    const raw = e.target.value;
    if (field === 'qty') {
      onFormChange({ ...materialForm, qty: parseInt(raw) || 1 });
    } else {
      onFormChange({ ...materialForm, [field]: raw });
    }
  };

  const hasMetadata = lastImportMetadata && (
    lastImportMetadata.area_solicitante ||
    lastImportMetadata.proyecto_obra ||
    lastImportMetadata.numero_solicitud ||
    lastImportMetadata.fecha_solicitud ||
    lastImportMetadata.fecha_requerida ||
    lastImportMetadata.prioridad ||
    lastImportMetadata.solicitado_por ||
    lastImportMetadata.cargo
  );

  const prioridadBadge = (valor) => {
    const map = {
      alta: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
      media: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
      baja: { bg: 'bg-green-100', text: 'text-green-700', label: 'Baja' },
    };
    const cfg = map[valor?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700', label: valor || '-' };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <DocumentPlusIcon className="size-[14.66px] text-primary" />
          </span>
          Especificación de Material
        </h3>
      </div>

      {/* Metadata block from last import */}
      {hasMetadata && (
        <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <InformationCircleIcon className="size-3.5" />
            Metadata importada
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
            {lastImportMetadata.area_solicitante && (
              <>
                <span className="text-gray-500">Área solicitante:</span>
                <span className="font-medium">{lastImportMetadata.area_solicitante}</span>
              </>
            )}
            {lastImportMetadata.proyecto_obra && (
              <>
                <span className="text-gray-500">Proyecto / Obra:</span>
                <span className="font-medium">{lastImportMetadata.proyecto_obra}</span>
              </>
            )}
            {lastImportMetadata.numero_solicitud && (
              <>
                <span className="text-gray-500">N° Solicitud:</span>
                <span className="font-medium">{lastImportMetadata.numero_solicitud}</span>
              </>
            )}
            {lastImportMetadata.fecha_solicitud && (
              <>
                <span className="text-gray-500">Fecha Solicitud:</span>
                <span className="font-medium">{new Date(lastImportMetadata.fecha_solicitud).toLocaleDateString('es-PE')}</span>
              </>
            )}
            {lastImportMetadata.fecha_requerida && (
              <>
                <span className="text-gray-500">Fecha Requerida:</span>
                <span className="font-medium">{new Date(lastImportMetadata.fecha_requerida).toLocaleDateString('es-PE')}</span>
              </>
            )}
            {lastImportMetadata.prioridad && (
              <>
                <span className="text-gray-500">Prioridad:</span>
                <span>{prioridadBadge(lastImportMetadata.prioridad)}</span>
              </>
            )}
            {lastImportMetadata.solicitado_por && (
              <>
                <span className="text-gray-500">Solicitado por:</span>
                <span className="font-medium">{lastImportMetadata.solicitado_por}</span>
              </>
            )}
            {lastImportMetadata.cargo && (
              <>
                <span className="text-gray-500">Cargo:</span>
                <span className="font-medium">{lastImportMetadata.cargo}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Cantidad *" type="number" min="1" value={materialForm.qty} onChange={handleChange('qty')} />
          <Input label="Tipo de Material *" placeholder="Ej: ángulo, brida..." value={materialForm.material_type} onChange={handleChange('material_type')} />
          <Input label="Especificación Técnica" placeholder="Ej: ángulos de 2&quot; x 3/16&quot;" value={materialForm.description} onChange={handleChange('description')} />
          <Input label="Medida" placeholder="Ej: und, kg, m..." value={materialForm.diameter} onChange={handleChange('diameter')} />
          <Input label="Tipo de Conexión" placeholder="Ej: soldable, roscado..." value={materialForm.series} onChange={handleChange('series')} />
          <Input label="Observaciones" placeholder="Notas adicionales..." value={materialForm.notes} onChange={handleChange('notes')} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 pt-6">
          <Button variant="primary" onClick={onCreateOrder} disabled={savingOrder || !materialForm.material_type || !materialForm.qty} loading={savingOrder} className="gap-2 px-5 h-8 text-[11px] rounded-lg">
            <PlusIcon className="size-3.5" />
            {savingOrder ? 'Enviando...' : 'Agregar Material'}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={onDownloadTemplate} 
              className="gap-1.5 h-8 px-4 text-[11px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm"
            >
              <ArrowDownTrayIcon className="size-3.5" />
              Plantilla
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 h-8 text-[11px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm">
              <ArrowUpTrayIcon className="size-3.5" />
              {importingFile ? 'Importando...' : 'Importar Excel'}
              <input type="file" accept=".xlsx,.xls" onChange={onImportExcel} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(MaterialForm);
