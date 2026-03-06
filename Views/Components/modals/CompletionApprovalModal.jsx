import { memo, useState } from 'react';
import {
  CheckBadgeIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

/**
 * CompletionApprovalModal — Manager/Admin revisa la solicitud de finalización
 * enviada por el supervisor, y la aprueba o rechaza.
 * @param {{ open: boolean, onClose: () => void, completionRequest: object|null, onApprove: (requestId: number) => void, onReject: (requestId: number, notes: string) => void, loading: boolean, projectName: string }} props
 */
function CompletionApprovalModal({ open, onClose, completionRequest, onApprove, onReject, loading, projectName }) {
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

  const handleApprove = () => {
    onApprove(completionRequest.id);
  };

  const handleClose = () => {
    setShowRejectField(false);
    setRejectNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Aprobar Recuento de Sobrantes"
      titleIcon={<CheckBadgeIcon className="size-5 text-emerald-600" />}
      size="lg"
      footer={
        showRejectField ? (
          <>
            <Button variant="ghost" onClick={() => setShowRejectField(false)} disabled={loading}>
              Volver
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
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cerrar
            </Button>
            <Button variant="danger" onClick={() => setShowRejectField(true)} disabled={loading}>
              <XCircleIcon className="mr-1 size-4" />
              Rechazar
            </Button>
            <Button variant="success" onClick={handleApprove} disabled={loading} loading={loading}>
              <CheckBadgeIcon className="mr-1 size-4" />
              Aprobar y Finalizar
            </Button>
          </>
        )
      }
    >
      {/* Request info */}
      <div className="mb-4 space-y-2">
        <h3 className="text-base font-semibold text-gray-900">{projectName}</h3>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <UserIcon className="size-4" />
            Solicitado por: <strong className="text-gray-700">{completionRequest.requested_by_name}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-4" />
            {new Date(completionRequest.created_at).toLocaleString('es-PE')}
          </span>
        </div>
      </div>

      {/* Materials table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2.5">Material</th>
              <th className="px-3 py-2.5 text-center">Unidad</th>
              <th className="px-3 py-2.5 text-center">Original</th>
              <th className="px-3 py-2.5 text-center">Sobrante</th>
              <th className="px-3 py-2.5 text-center">Usada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((mat, i) => (
              <tr
                key={i}
                className={mat.cantidad_sobra > 0 ? 'bg-amber-50/50' : ''}
              >
                <td className="px-3 py-2.5 font-medium text-gray-900">{mat.nombre}</td>
                <td className="px-3 py-2.5 text-center text-gray-500">{mat.unidad || '—'}</td>
                <td className="px-3 py-2.5 text-center text-gray-700">{mat.cantidad_original}</td>
                <td className="px-3 py-2.5 text-center">
                  {mat.cantidad_sobra > 0 ? (
                    <Badge variant="emerald" dot>+{mat.cantidad_sobra}</Badge>
                  ) : (
                    <span className="text-gray-300">0</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center font-semibold text-gray-900">{mat.cantidad_usada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
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

      {/* Rejection field (only shown after clicking Reject) */}
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
    </Modal>
  );
}

export default memo(CompletionApprovalModal);
