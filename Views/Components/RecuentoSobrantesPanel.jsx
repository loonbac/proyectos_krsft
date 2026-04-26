import { memo, useState, useMemo } from 'react';
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';

/**
 * RecuentoSobrantesPanel — Sección fija visible cuando el proyecto está en estado
 * 'pendiente_recuento'. El supervisor debe reportar las cantidades sobrantes de
 * cada material para que sean devueltos a inventario.
 *
 * @param {{ materials: Array, completionRequest: object|null, onSubmit: (materials: Array) => void, loading: boolean }} props
 */
function RecuentoSobrantesPanel({ materials, completionRequest, onSubmit, loading }) {
  const [quantities, setQuantities] = useState({});
  const [errors, setErrors] = useState({});

  const isRejected = completionRequest?.status === 'rejected';
  const isPending = completionRequest?.status === 'pending';

  const materialsList = useMemo(() => {
    if (!materials || materials.length === 0) return [];
    return materials;
  }, [materials]);

  /** Clave única por material (evita colisiones entre project e inventory con mismo producto_id) */
  const getMaterialKey = (mat) =>
    mat.source === 'inventory'
      ? `inv-${mat.producto_id}-${mat.reservation_id}`
      : `proj-${mat.producto_id}`;

  const handleQtyChange = (key, value, cantidadOriginal) => {
    const raw = value.replace(/[^0-9]/g, '');
    const num = raw === '' ? '' : parseInt(raw, 10);
    setQuantities(prev => ({ ...prev, [key]: num }));

    if (num !== '' && num > cantidadOriginal) {
      setErrors(prev => ({ ...prev, [key]: `Máx: ${cantidadOriginal}` }));
    } else {
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const getSobrante = (mat) => {
    const val = quantities[getMaterialKey(mat)];
    return val !== undefined && val !== '' ? val : 0;
  };

  const hasErrors = Object.keys(errors).length > 0;

  const totalSobrante = materialsList.reduce((acc, mat) => acc + getSobrante(mat), 0);

  const handleSubmit = () => {
    if (hasErrors || isPending) return;

    const materialsPayload = materialsList.map(mat => ({
      producto_id: mat.producto_id,
      cantidad_sobrante: getSobrante(mat),
      source: mat.source || 'project',
      reservation_id: mat.reservation_id || null,
    }));

    onSubmit(materialsPayload);
  };

  return (
    <section className="rounded-lg border-2 border-amber-300 bg-amber-50/50 p-6 shadow-sm">
      {/* Banner */}
      <div className="flex items-start gap-3 mb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <ClipboardDocumentListIcon className="size-5 text-amber-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-amber-900">
            Recuento de Sobrantes
          </h3>
          <p className="text-sm text-amber-700 mt-0.5">
            El proyecto ha sido finalizado. Revise los materiales y registre las cantidades sobrantes que serán devueltas a inventario general.
          </p>
        </div>
        {isPending && (
          <Badge variant="amber" dot>
            Esperando aprobación
          </Badge>
        )}
      </div>

      {/* Rejection banner */}
      {isRejected && completionRequest.rejection_notes && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Recuento rechazado</p>
            <p className="text-sm text-red-700 mt-0.5">{completionRequest.rejection_notes}</p>
            <p className="text-xs text-red-500 mt-1">Corrija las cantidades y vuelva a enviar el recuento.</p>
          </div>
        </div>
      )}

      {/* Pending banner */}
      {isPending && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <ClockIcon className="size-5 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Recuento enviado</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Su recuento de sobrantes está siendo revisado por el jefe de proyectos. Los campos están deshabilitados hasta que sea aprobado o rechazado.
            </p>
          </div>
        </div>
      )}

      {/* Materials table */}
      {materialsList.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircleIcon className="mx-auto size-12 text-emerald-300" />
          <p className="mt-2 text-sm text-gray-500">No hay materiales amarrados a este proyecto.</p>
          <p className="text-xs text-gray-400">Todos los materiales ya fueron procesados.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Tipo de Material</th>
                  <th className="px-4 py-3">Especificación Técnica</th>
                  <th className="px-4 py-3 text-center">Unidad</th>
                  <th className="px-4 py-3 text-center">Cant. Original</th>
                  <th className="px-4 py-3 text-center">Cant. Sobrante</th>
                  <th className="px-4 py-3 text-center">Cant. Usada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialsList.map(mat => {
                  const key = getMaterialKey(mat);
                  const sobrante = getSobrante(mat);
                  const usada = mat.cantidad_original - sobrante;
                  const error = errors[key];

                  return (
                    <tr key={key} className={error ? 'bg-red-50/50' : ''}>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {mat.material_type || '—'}
                        {mat.source === 'inventory' && (
                          <span className="block text-xs text-cyan-600 font-medium">De inventario</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{mat.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{mat.unidad || '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">{mat.cantidad_original}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={quantities[key] ?? ''}
                            onChange={e => handleQtyChange(key, e.target.value, mat.cantidad_original)}
                            placeholder="0"
                            disabled={isPending}
                            className={`w-20 rounded-md border px-2 py-1.5 text-center text-sm font-medium transition-colors
                              ${error
                                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 bg-white text-gray-900 focus:border-primary focus:ring-primary'
                              }
                              ${isPending ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}
                            `}
                          />
                          {error && <span className="text-xs text-red-500">{error}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${usada < mat.cantidad_original ? 'text-amber-600' : 'text-gray-700'}`}>
                          {usada}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary + Submit */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{materialsList.length}</span> materiales
              </div>
              {totalSobrante > 0 && (
                <Badge variant="emerald" dot>
                  {totalSobrante} unidades sobrantes a devolver
                </Badge>
              )}
            </div>

            {!isPending && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={hasErrors || loading}
                loading={loading}
                className="gap-2"
              >
                {isRejected ? (
                  <>
                    <ArrowPathIcon className="size-4" />
                    Reenviar Recuento
                  </>
                ) : (
                  <>
                    <ClipboardDocumentListIcon className="size-4" />
                    Enviar Recuento de Sobrantes
                  </>
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default memo(RecuentoSobrantesPanel);
