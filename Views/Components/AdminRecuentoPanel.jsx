import { memo, useState } from 'react';
import {
  CheckBadgeIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';

/**
 * AdminRecuentoPanel — Panel fijo visible para admin/jefe cuando el proyecto
 * está en 'pendiente_recuento' y el supervisor ya envió el recuento de sobrantes.
 * Permite aprobar o rechazar el recuento directamente desde la vista de detalle.
 *
 * @param {{ completionRequest: object, onApprove: (requestId: number) => void, onReject: (requestId: number, notes: string) => void, loading: boolean, projectName: string }} props
 */
function AdminRecuentoPanel({ completionRequest, onApprove, onReject, loading, projectName }) {
  const [showRejectField, setShowRejectField] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  if (!completionRequest) return null;

  const materials = completionRequest.materials_data || [];
  const conSobras = materials.filter((m) => m.cantidad_sobra > 0);
  const totalSobra = conSobras.reduce((acc, m) => acc + m.cantidad_sobra, 0);

  const handleReject = () => {
    if (!rejectNotes.trim()) return;
    onReject(completionRequest.id, rejectNotes.trim());
    setRejectNotes('');
    setShowRejectField(false);
  };

  return (
    <section className="rounded-lg border-2 border-emerald-300 bg-emerald-50/50 p-6 shadow-sm">
      {/* Banner */}
      <div className="flex items-start gap-3 mb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <ClipboardDocumentCheckIcon className="size-5 text-emerald-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-emerald-900">
            Recuento de Sobrantes — Pendiente de Aprobación
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-emerald-700 mt-1">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-4" />
              Enviado por: <strong>{completionRequest.requested_by_name}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="size-4" />
              {new Date(completionRequest.created_at).toLocaleString('es-PE')}
            </span>
          </div>
        </div>
        <Badge variant="amber" dot>Pendiente</Badge>
      </div>

      {/* Materials table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Tipo de Material</th>
              <th className="px-4 py-3">Especificación Técnica</th>
              <th className="px-4 py-3 text-center">Unidad</th>
              <th className="px-4 py-3 text-center">Original</th>
              <th className="px-4 py-3 text-center">Sobrante</th>
              <th className="px-4 py-3 text-center">Usada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((mat, i) => (
              <tr key={i} className={mat.cantidad_sobra > 0 ? 'bg-amber-50/50' : ''}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{mat.material_type || '—'}</div>
                  {mat.source === 'inventory' && (
                    <span className="text-xs text-cyan-600 font-medium">De inventario</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{mat.nombre || '—'}</td>
                <td className="px-4 py-3 text-center text-gray-500">{mat.unidad || '—'}</td>
                <td className="px-4 py-3 text-center text-gray-700 font-semibold">{mat.cantidad_original}</td>
                <td className="px-4 py-3 text-center">
                  {mat.cantidad_sobra > 0 ? (
                    <Badge variant="emerald" dot>+{mat.cantidad_sobra}</Badge>
                  ) : (
                    <span className="text-gray-300">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900">{mat.cantidad_usada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-white/60 px-4 py-3">
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{materials.length}</span> materiales
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-amber-600">{conSobras.length}</span> con sobrantes
        </div>
        {totalSobra > 0 && (
          <Badge variant="emerald" dot>
            {totalSobra} unidades sobrantes a devolver al inventario
          </Badge>
        )}
      </div>

      {/* Rejection field */}
      {showRejectField && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <label className="block text-sm font-medium text-red-800 mb-1">
            Motivo del rechazo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Indique el motivo del rechazo para que el supervisor pueda corregir..."
            rows={3}
            maxLength={1000}
            className="w-full rounded border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
          />
          <p className="mt-1 text-xs text-red-500">{rejectNotes.length}/1000</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-5 flex justify-end gap-3">
        {showRejectField ? (
          <>
            <Button variant="ghost" onClick={() => setShowRejectField(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectNotes.trim() || loading}
              loading={loading}
            >
              Confirmar Rechazo
            </Button>
          </>
        ) : (
          <>
            <Button variant="danger" onClick={() => setShowRejectField(true)} disabled={loading}>
              <XCircleIcon className="mr-1 size-4" />
              Rechazar
            </Button>
            <Button
              variant="success"
              onClick={() => onApprove(completionRequest.id)}
              disabled={loading}
              loading={loading}
            >
              <CheckBadgeIcon className="mr-1 size-4" />
              Aprobar y Finalizar Proyecto
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export default memo(AdminRecuentoPanel);
