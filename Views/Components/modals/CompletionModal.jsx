import { memo, useState, useMemo } from 'react';
import {
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

/**
 * CompletionModal — Supervisor revisa materiales amarrados al proyecto,
 * marca sobras y ajusta cantidades antes de solicitar la finalización.
 * @param {{ open: boolean, onClose: () => void, materials: Array, onSubmit: (materials: Array) => void, loading: boolean, projectName: string }} props
 */
function CompletionModal({ open, onClose, materials, onSubmit, loading, projectName }) {
  // Track which items the supervisor has marked as having leftover
  const [checked, setChecked] = useState({});
  // Track overridden quantities (cantidad_usada) per producto_id
  const [quantities, setQuantities] = useState({});
  // Validation errors per producto_id
  const [errors, setErrors] = useState({});

  // Reset state whenever modal opens with fresh materials
  const materialsList = useMemo(() => {
    if (!materials || materials.length === 0) return [];
    // Reset internal state when materials change
    setChecked({});
    setQuantities({});
    setErrors({});
    return materials;
  }, [materials]);

  const toggleCheck = (prodId) => {
    setChecked((prev) => {
      const next = { ...prev, [prodId]: !prev[prodId] };
      // If unchecking, reset quantity to original
      if (!next[prodId]) {
        setQuantities((q) => { const nq = { ...q }; delete nq[prodId]; return nq; });
        setErrors((e) => { const ne = { ...e }; delete ne[prodId]; return ne; });
      }
      return next;
    });
  };

  const handleQtyChange = (prodId, value, cantidadOriginal) => {
    const raw = value.replace(/[^0-9]/g, '');
    const num = raw === '' ? '' : parseInt(raw, 10);
    setQuantities((prev) => ({ ...prev, [prodId]: num }));

    if (num === '' || isNaN(num)) {
      setErrors((prev) => ({ ...prev, [prodId]: 'Requerido' }));
    } else if (num < 0) {
      setErrors((prev) => ({ ...prev, [prodId]: 'No puede ser negativo' }));
    } else if (num > cantidadOriginal) {
      setErrors((prev) => ({ ...prev, [prodId]: `Máx: ${cantidadOriginal}` }));
    } else {
      setErrors((prev) => { const ne = { ...prev }; delete ne[prodId]; return ne; });
    }
  };

  const getCantidadUsada = (mat) => {
    if (!checked[mat.producto_id]) return mat.cantidad_original;
    const q = quantities[mat.producto_id];
    return q === '' || q === undefined ? mat.cantidad_original : q;
  };

  const getSobra = (mat) => {
    const usada = getCantidadUsada(mat);
    if (typeof usada !== 'number') return 0;
    return Math.max(0, mat.cantidad_original - usada);
  };

  // Summary
  const summary = useMemo(() => {
    let conSobras = 0;
    let totalSobra = 0;
    materialsList.forEach((mat) => {
      const sobra = getSobra(mat);
      if (checked[mat.producto_id] && sobra > 0) {
        conSobras++;
        totalSobra += sobra;
      }
    });
    return { total: materialsList.length, conSobras, totalSobra };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialsList, checked, quantities]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = () => {
    if (hasErrors || loading) return;
    const result = materialsList.map((mat) => ({
      producto_id: mat.producto_id,
      cantidad_usada: getCantidadUsada(mat),
    }));
    onSubmit(result);
  };

  const specsText = (mat) => {
    const parts = [];
    if (mat.material_type) parts.push(mat.material_type);
    if (mat.diameter) parts.push(mat.diameter);
    if (mat.series) parts.push(mat.series);
    return parts.join(' · ');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finalizar Proyecto — Revisión de Materiales"
      titleIcon={<ClipboardDocumentCheckIcon className="size-5 text-primary" />}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={hasErrors || loading}
            loading={loading}
          >
            Enviar Solicitud de Finalización
          </Button>
        </>
      }
    >
      {/* Header info */}
      <div className="mb-4 rounded-lg bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          <strong>{projectName}</strong> — Revise los materiales amarrados al proyecto.
          Marque la casilla de los materiales que tienen sobras y ajuste la cantidad real usada.
          Los materiales sin marcar se consideran completamente usados.
        </p>
      </div>

      {materialsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ExclamationTriangleIcon className="size-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No hay materiales amarrados a este proyecto.</p>
          <p className="text-xs text-gray-400">Puede finalizar directamente sin ajustes de sobras.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2.5 w-10">Sobra</th>
                  <th className="px-3 py-2.5">Material</th>
                  <th className="px-3 py-2.5 text-center w-24">Cant. Original</th>
                  <th className="px-3 py-2.5 text-center w-16">Unidad</th>
                  <th className="px-3 py-2.5 text-center w-32">Cant. Real Usada</th>
                  <th className="px-3 py-2.5 text-center w-24">Sobra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialsList.map((mat) => {
                  const isChecked = !!checked[mat.producto_id];
                  const sobra = getSobra(mat);
                  const error = errors[mat.producto_id];

                  return (
                    <tr
                      key={mat.producto_id}
                      className={isChecked ? 'bg-amber-50/50' : 'hover:bg-gray-50'}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(mat.producto_id)}
                          className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>

                      {/* Material name + specs */}
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-gray-900">{mat.nombre}</span>
                        {specsText(mat) && (
                          <span className="ml-2 text-xs text-gray-400">{specsText(mat)}</span>
                        )}
                      </td>

                      {/* Cantidad original */}
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-700">
                        {mat.cantidad_original}
                      </td>

                      {/* Unidad */}
                      <td className="px-3 py-2.5 text-center text-gray-500">
                        {mat.unidad || '—'}
                      </td>

                      {/* Cantidad usada (editable when checked) */}
                      <td className="px-3 py-2.5 text-center">
                        {isChecked ? (
                          <div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={quantities[mat.producto_id] ?? mat.cantidad_original}
                              onChange={(e) => handleQtyChange(mat.producto_id, e.target.value, mat.cantidad_original)}
                              className={`w-20 rounded border px-2 py-1 text-center text-sm ${
                                error
                                  ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:border-primary focus:ring-primary'
                              }`}
                            />
                            {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400">{mat.cantidad_original}</span>
                        )}
                      </td>

                      {/* Sobra */}
                      <td className="px-3 py-2.5 text-center">
                        {isChecked && sobra > 0 ? (
                          <Badge variant="emerald" dot>
                            +{sobra}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{summary.total}</span> materiales totales
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-amber-600">{summary.conSobras}</span> con sobras
            </div>
            {summary.totalSobra > 0 && (
              <div className="text-sm">
                <Badge variant="emerald" dot>
                  <ArrowPathIcon className="mr-1 size-3.5" />
                  {summary.totalSobra} unidades a devolver al inventario
                </Badge>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export default memo(CompletionModal);
