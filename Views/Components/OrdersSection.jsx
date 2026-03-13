import { memo } from 'react';
import {
  DocumentTextIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import {
  formatNumber, getCurrencySymbol,
  getOrderBadgeVariant, getOrderStatusLabel, getOrderQuantity,
  getOrderEffectiveAmount,
} from '../utils';

/**
 * OrdersSection – Orders grouped by file with expand/collapse (detail view).
 * Includes material arrival tracking.
 */
function OrdersSection({
  ordersGroupedByFile,
  expandedFiles,
  selectedProject,
  canApprove,
  readOnly,
  onToggleFile,
  onApproveAll,
  onApproveSelected,

  onApproveMaterial,
  onRejectMaterial,
  isOrderSelected,
  toggleOrderSelection,
  getSelectedCount,
  getGroupKey,
  getGroupDraftOrders,
  onMarkArrived,
  onMarkNotArrived,
}) {
  const handleArrivalToggle = (order) => {
    if (!order.payment_confirmed) return;
    if (order.material_arrived) {
      onMarkNotArrived?.([order.id]);
    } else {
      onMarkArrived?.([order.id]);
    }
  };

  return (
    <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
        <DocumentTextIcon className="size-5 text-primary" />
        Materiales / Órdenes
      </h3>

      {ordersGroupedByFile.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay órdenes aún</p>
      ) : (
        <div className="space-y-3">
          {ordersGroupedByFile.map((group) => {
            const gKey = getGroupKey(group);
            const isExpanded = expandedFiles[gKey];
            const draftOrders = getGroupDraftOrders(group);
            const selectedCount = getSelectedCount(group);
            const paidOrders = group.orders.filter(o => o.payment_confirmed);
            const arrivedCount = paidOrders.filter(o => o.material_arrived).length;
            const hasPendingArrival = paidOrders.length > 0 && arrivedCount < paidOrders.length;

            return (
              <div key={gKey} className="rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                {/* Group header */}
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  onClick={() => onToggleFile(group.filename)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleFile(group.filename); } }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRightIcon className={`size-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <DocumentTextIcon className="size-4 shrink-0 text-gray-400" />
                    <span className="truncate font-medium text-gray-700">{group.isInventoryGroup ? 'Materiales de Inventario' : (group.filename || 'Órdenes Manuales')}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {canApprove && !readOnly && draftOrders.length > 0 && (
                      <>
                        {selectedCount > 0 && (
                          <Button variant="success" size="sm" onClick={() => onApproveSelected(group)}>
                            Aprobar {selectedCount}
                          </Button>
                        )}
                        <Button variant="success" size="sm" onClick={() => onApproveAll(group)}>
                          Aprobar Todo ({draftOrders.length})
                        </Button>
                      </>
                    )}

                    <Badge variant="gray">{group.totalCount} items</Badge>
                    <Badge variant={group.allDelivered ? 'emerald' : group.allPaid ? 'blue' : 'amber'}>
                      {group.allDelivered ? 'Entregado' : group.allPaid ? 'Pagado' : `${group.paidCount}/${group.totalCount}`}
                    </Badge>
                    {paidOrders.length > 0 && (
                      <Badge variant={hasPendingArrival ? 'amber' : 'emerald'}>
                        {hasPendingArrival
                          ? `Recibido ${arrivedCount}/${paidOrders.length}`
                          : <><CheckCircleIcon className="size-3.5 inline -mt-0.5" /> Todo recibido</>
                        }
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {canApprove && <th className="px-3 py-2 text-center  text-xs font-medium uppercase text-gray-500 w-12"><input type="checkbox" disabled className="rounded border-gray-300" /></th>}
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ITEM</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">CANTIDAD</th>
                          <th className="px-3 py-2 text-left  text-xs font-medium uppercase text-gray-500 whitespace-nowrap">TIPO DE MATERIAL</th>
                          <th className="px-3 py-2 text-left  text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ESPECIFICACION TECNICA</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">MEDIDA</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">TIPO DE CONEXIÓN</th>
                          <th className="px-3 py-2 text-left  text-xs font-medium uppercase text-gray-500 whitespace-nowrap">OBSERVACIONES</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ESTADO</th>
                          <th className="px-3 py-2 text-right  text-xs font-medium uppercase text-gray-500 whitespace-nowrap">MONTO</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">RECIBIDO</th>
                          {canApprove && !readOnly && <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ACCIONES</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.orders.map(order => {
                          const isSelected = isOrderSelected(group, order.id);
                          const isDraft = order.status === 'draft';
                          const isPaid = !!order.payment_confirmed;

                          return (
                            <tr
                              key={order.id}
                              className={`transition-colors ${isDraft && canApprove ? 'cursor-pointer' : ''
                                } ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                              onClick={() => isDraft && canApprove && toggleOrderSelection(group, order)}
                            >
                              {canApprove && (
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }}
                                    disabled={!isDraft}
                                    className="rounded border-gray-300 pointer-events-none"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.item_number || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{getOrderQuantity(order)}</td>
                              <td className="px-3 py-2 text-left  text-gray-700 whitespace-nowrap">{order.material_type || '-'}</td>
                              <td className="px-3 py-2 text-left  text-gray-700 whitespace-nowrap">{order.description || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.diameter || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.series || '-'}</td>
                              <td className="px-3 py-2 text-left  text-gray-700 whitespace-nowrap">{order.notes || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                                {order.amount === null && order.status === 'pending' ? (
                                  <Badge variant="gray">Por cotizar</Badge>
                                ) : (
                                  <Badge variant={getOrderBadgeVariant(order)}>{getOrderStatusLabel(order)}</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap font-medium">{order.amount != null ? `${getCurrencySymbol(selectedProject.currency)} ${formatNumber(getOrderEffectiveAmount(order))}` : '-'}</td>
                              <td className="px-3 py-2 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                {isPaid ? (
                                  <button
                                    onClick={() => handleArrivalToggle(order)}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                      order.material_arrived
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    }`}
                                  >
                                    {order.material_arrived
                                      ? <><CheckCircleIcon className="size-3.5" /> Sí</>
                                      : 'No'
                                    }
                                  </button>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {canApprove && !readOnly && (
                                <td className="px-3 py-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {isDraft ? (
                                    <div className="flex justify-center gap-2">
                                      <button
                                        onClick={() => onApproveMaterial(order.id)}
                                        title="Aprobar"
                                        className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-7 py-1 text-white transition-colors hover:bg-emerald-600 shadow-sm"
                                      >
                                        <CheckIcon className="size-4" />
                                      </button>
                                      <button
                                        onClick={() => onRejectMaterial(order.id)}
                                        title="Rechazar"
                                        className="inline-flex items-center justify-center rounded-md bg-red-500 px-7 py-1 text-white transition-colors hover:bg-red-600 shadow-sm"
                                      >
                                        <XMarkIcon className="size-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default memo(OrdersSection);
