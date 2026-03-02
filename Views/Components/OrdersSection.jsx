import { memo } from 'react';
import {
  DocumentTextIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import {
  formatNumber, getCurrencySymbol,
  getOrderBadgeVariant, getOrderStatusLabel, getOrderQuantity,
} from '../utils';

/**
 * OrdersSection – Orders grouped by file with expand/collapse (detail view).
 */
function OrdersSection({
  ordersGroupedByFile,
  expandedFiles,
  selectedProject,
  isSupervisor,
  onToggleFile,
  onApproveAll,
  onApproveSelected,
  onConfirmFileDelivery,
  onApproveMaterial,
  onRejectMaterial,
  isOrderSelected,
  toggleOrderSelection,
  getSelectedCount,
  getGroupKey,
  getGroupDraftOrders,
}) {
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

            return (
              <div key={gKey} className="rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                {/* Group header */}
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => onToggleFile(group.filename)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleFile(group.filename); } }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRightIcon className={`size-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <DocumentTextIcon className="size-4 shrink-0 text-gray-400" />
                    <span className="truncate font-medium text-gray-700">{group.filename || 'Órdenes Manuales'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {!isSupervisor && draftOrders.length > 0 && (
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
                    {group.allPaid && !group.allDelivered && isSupervisor && (
                      <Button variant="primary" size="sm" onClick={() => onConfirmFileDelivery(group)}>
                        Confirmar Entrega
                      </Button>
                    )}
                    <Badge variant="gray">{group.totalCount} items</Badge>
                    <Badge variant={group.allDelivered ? 'emerald' : group.allPaid ? 'blue' : 'amber'}>
                      {group.allDelivered ? 'Entregado' : group.allPaid ? 'Pagado' : `${group.paidCount}/${group.totalCount}`}
                    </Badge>
                  </div>
                </div>

                {/* Expanded table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {!isSupervisor && <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 w-12"><input type="checkbox" disabled className="rounded border-gray-300" /></th>}
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ITEM</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">CANT.</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">UND</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">DESCRIPCIÓN</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">DIÁMETRO</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">SERIE</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">MATERIAL</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ESTADO</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 whitespace-nowrap">MONTO</th>
                          {!isSupervisor && <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ACCIONES</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.orders.map(order => {
                          const isSelected = isOrderSelected(group, order.id);
                          const isDraft = order.status === 'draft';
                          
                          return (
                            <tr 
                              key={order.id} 
                              className={`transition-colors ${
                                isDraft ? 'cursor-pointer' : ''
                              } ${
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => isDraft && !isSupervisor && toggleOrderSelection(group, order)}
                            >
                              {!isSupervisor && (
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    disabled={!isDraft}
                                    className="rounded border-gray-300 pointer-events-none"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.item_number || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{getOrderQuantity(order)}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.unit || 'UND'}</td>
                              <td className="px-3 py-2 text-left text-gray-700">{order.description}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.diameter || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.series || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{order.material_type || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                                {order.amount === null && order.status === 'pending' ? (
                                  <Badge variant="gray">Por cotizar</Badge>
                                ) : (
                                  <Badge variant={getOrderBadgeVariant(order)}>{getOrderStatusLabel(order)}</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap font-medium">{order.amount != null ? `${getCurrencySymbol(selectedProject.currency)} ${formatNumber(order.amount)}` : '-'}</td>
                              {!isSupervisor && (
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
