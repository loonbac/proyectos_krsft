import { memo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  BuildingOfficeIcon,
  TagIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  BriefcaseIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

/**
 * ImportPreviewModal – Preview of imported materials before confirming.
 */
function ImportPreviewModal({
  open,
  onClose,
  items,
  metadata,
  importing,
  onConfirm,
}) {
  const hasMetadata = metadata && (
    metadata.area_solicitante ||
    metadata.proyecto_obra ||
    metadata.numero_solicitud ||
    metadata.fecha_solicitud ||
    metadata.fecha_requerida ||
    metadata.prioridad ||
    metadata.solicitado_por ||
    metadata.cargo
  );



  return (
    <Modal
      open={open}
      onClose={onClose}
      title="VISTA PREVIA DE IMPORTACIÓN"
      titleIcon={DocumentTextIcon}
      size="lg"
      showCloseButton={false}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirm} disabled={importing} loading={importing}>
            {importing ? 'Importando...' : 'Confirmar Importación'}
          </Button>
        </>
      }
    >
      {/* Metadata block */}
      {hasMetadata && (
        <div className="mb-6 rounded-xl border border-primary-100 bg-primary-50/20 p-5 text-sm">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary-700">
            <InformationCircleIcon className="size-4" />
            Información de la Orden
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 text-xs text-gray-700">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Área Solicitante</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.area_solicitante || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Proyecto / Obra</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.proyecto_obra || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TagIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">N° Solicitud</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.numero_solicitud || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ClockIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Fecha Solicitud</span>
                <span className="font-semibold text-gray-700 leading-tight">
                  {metadata.fecha_solicitud ? (
                    metadata.fecha_solicitud.includes('-') 
                      ? new Date(`${metadata.fecha_solicitud}T00:00:00`).toLocaleDateString('es-PE')
                      : metadata.fecha_solicitud
                  ) : '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CalendarIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Fecha Requerida</span>
                <span className="font-semibold text-gray-700 leading-tight">
                  {metadata.fecha_requerida ? (
                    metadata.fecha_requerida.includes('-')
                      ? new Date(`${metadata.fecha_requerida}T00:00:00`).toLocaleDateString('es-PE')
                      : metadata.fecha_requerida
                  ) : '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ExclamationCircleIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Prioridad</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.prioridad || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Solicitado por</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.solicitado_por || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <BriefcaseIcon className="size-4 text-primary-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary-600/60 leading-none mb-1">Cargo</span>
                <span className="font-semibold text-gray-700 leading-tight">{metadata.cargo || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mb-3 text-sm text-gray-500">{items.length} materiales encontrados:</p>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary/80">{it.number}</span>
              <span className="text-sm font-medium text-gray-900">{it.material_type || 'Sin tipo'}</span>
            </div>
            {it.description && <p className="mt-0.5 ml-8 text-xs text-gray-500">{it.description}</p>}
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 ml-8">
              <span>Cant: {it.quantity}</span>
              {it.diameter && <span>Medida: {it.diameter}</span>}
              {it.series && <span>Conexión: {it.series}</span>}
              {it.notes && <span>Obs: {it.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default memo(ImportPreviewModal);
