import { memo, useMemo, useState } from 'react';
import {
  DocumentTextIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  CalendarIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  TagIcon,
  ClockIcon,
  ExclamationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Modal from './ui/Modal';
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
  onExportMaterials,
  onApproveMaterial,
  onRejectMaterial,
  isOrderSelected,
  toggleOrderSelection,
  getSelectedCount,
  getGroupKey,
  getGroupDraftOrders,
  onMarkArrived,
  onMarkNotArrived,
  canDelete,
  onDeleteList,
}) {
  const [infoGroup, setInfoGroup] = useState(null);

  const infoMetadata = infoGroup?.metadata || {};
  const hasInfoMetadata = useMemo(() => (
    infoMetadata.area_solicitante ||
    infoMetadata.proyecto_obra ||
    infoMetadata.numero_solicitud ||
    infoMetadata.fecha_solicitud ||
    infoMetadata.fecha_requerida ||
    infoMetadata.prioridad ||
    infoMetadata.solicitado_por ||
    infoMetadata.cargo
  ), [infoMetadata]);

  const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('es-PE');
  };

  const formatPriority = (value) => {
    if (!value) return '-';
    const normalized = String(value).toLowerCase();
    if (normalized === 'alta') return 'Alta';
    if (normalized === 'media') return 'Media';
    if (normalized === 'baja') return 'Baja';
    return value;
  };

  const handleArrivalToggle = (order) => {
    if (!order.payment_confirmed) return;
    if (order.material_arrived) {
      onMarkNotArrived?.([order.id]);
    } else {
      onMarkArrived?.([order.id]);
    }
  };

  return (
    <section className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <DocumentTextIcon className="size-[14.66px] text-primary" />
          </span>
          Materiales / Órdenes
        </h3>

      </div>

      <div className="px-6 py-5">
      {ordersGroupedByFile.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No hay órdenes aún</p>
      ) : (
        <div className="flex flex-col gap-3">
          {ordersGroupedByFile.map((group) => {
            const gKey = getGroupKey(group);
            const isExpanded = expandedFiles[gKey];
            const draftOrders = getGroupDraftOrders(group);
            const selectedCount = getSelectedCount(group);
            const paidOrders = group.orders.filter(o => o.payment_confirmed);
            const arrivedCount = paidOrders.filter(o => o.material_arrived).length;
            const hasPendingArrival = paidOrders.length > 0 && arrivedCount < paidOrders.length;

            return (
              <div key={gKey} className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                {/* Group header */}
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-sm transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'
                    }`}
                  onClick={() => onToggleFile(group.filename)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleFile(group.filename); } }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRightIcon className={`size-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className="rounded-full bg-gray-100 p-1.5 hidden sm:inline-flex"><DocumentTextIcon className="size-3.5 shrink-0 text-gray-500" /></span>
                    <strong className="truncate font-medium text-gray-800">{group.isInventoryGroup ? 'Materiales de Inventario' : (group.filename || 'Órdenes Manuales')}</strong>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {canDelete && !group.isInventoryGroup && group.filename && (
                      <button
                        type="button"
                        onClick={() => onDeleteList(group)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                        title="Eliminar toda la lista"
                      >
                        <TrashIcon className="size-3.5" />
                        Eliminar
                      </button>
                    )}
                    {!group.isInventoryGroup && !!group.filename && (
                      <button
                        type="button"
                        onClick={() => setInfoGroup(group)}
                        className="inline-flex"
                        title="Ver información de importación"
                      >
                        <Badge variant="blue" className="cursor-pointer text-xs font-semibold hover:bg-blue-200">
                          <InformationCircleIcon className="size-3.5 me-1" />
                          INFO
                        </Badge>
                      </button>
                    )}
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
                          : <><CheckCircleIcon className="size-3.5 inline -ms-0.5 me-1" /> Todo recibido</>
                        }
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                      <thead className="ltr:text-left rtl:text-right">
                        <tr>
                          {canApprove && <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 w-12 text-center"><input type="checkbox" disabled className="rounded border-gray-300" /></th>}
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">ITEM</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">CANTIDAD</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">TIPO DE MATERIAL</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">ESPECIFICACIÓN TÉCNICA</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">MEDIDA</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">TIPO DE CONEXIÓN</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">OBSERVACIONES</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">ESTADO</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-right">MONTO</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">RECIBIDO</th>
                          {canApprove && !readOnly && <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">ACCIONES</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {group.orders.map(order => {
                          const isSelected = isOrderSelected(group, order.id);
                          const isDraft = order.status === 'draft';
                          const isPaid = !!order.payment_confirmed;

                          return (
                            <tr
                              key={order.id}
                              className={`transition-colors ${isDraft && canApprove ? 'cursor-pointer' : ''
                                } ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                                }`}
                              onClick={() => isDraft && canApprove && toggleOrderSelection(group, order)}
                            >
                              {canApprove && (
                                <td className="whitespace-nowrap px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }}
                                    disabled={!isDraft}
                                    className="rounded border-gray-300 pointer-events-none"
                                  />
                                </td>
                              )}
                              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700">{order.item_number || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700 font-medium">{getOrderQuantity(order)}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-left text-gray-700">{order.material_type || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-left text-gray-700">{order.description || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700">{order.diameter || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700">{order.series || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-left text-gray-500 truncate max-w-[200px]" title={order.notes}>{order.notes || '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-center">
                                {order.amount === null && order.status === 'pending' ? (
                                  <Badge variant="gray">Por cotizar</Badge>
                                ) : (
                                  <Badge variant={getOrderBadgeVariant(order)}>{getOrderStatusLabel(order)}</Badge>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900 font-semibold">{order.amount != null ? `${getCurrencySymbol(selectedProject.currency)} ${formatNumber(getOrderEffectiveAmount(order))}` : '-'}</td>
                              <td className="whitespace-nowrap px-4 py-2 text-center" onClick={e => e.stopPropagation()}>
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
                                <td className="whitespace-nowrap px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
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
      </div>

      <Modal
        open={!!infoGroup}
        onClose={() => setInfoGroup(null)}
        title="Información de Importación"
        size="md"
        showCloseButton={false}
        footer={<Button variant="danger" onClick={() => setInfoGroup(null)}>Cerrar</Button>}
      >
        <div className="space-y-4">
          {hasInfoMetadata ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <BuildingOfficeIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ÁREA SOLICITANTE</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase truncate" title={infoMetadata.area_solicitante}>{infoMetadata.area_solicitante || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <TagIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">N° SOLICITUD</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase">{infoMetadata.numero_solicitud || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CalendarIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FECHA REQUERIDA</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase">{formatDate(infoMetadata.fecha_requerida) || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <UserIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SOLICITADO POR</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase truncate" title={infoMetadata.solicitado_por}>{infoMetadata.solicitado_por || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <BuildingOfficeIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PROYECTO / OBRA</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase truncate" title={infoMetadata.proyecto_obra}>{infoMetadata.proyecto_obra || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <ClockIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FECHA SOLICITUD</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase">{formatDate(infoMetadata.fecha_solicitud) || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <ExclamationCircleIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PRIORIDAD</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase">{formatPriority(infoMetadata.prioridad) || '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                <BriefcaseIcon className="size-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CARGO</p>
                  <p className="text-sm font-semibold text-gray-900 uppercase truncate" title={infoMetadata.cargo}>{infoMetadata.cargo || '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <InformationCircleIcon className="size-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-500 italic uppercase">Este archivo no tiene metadata de importación registrada.</p>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}

export default memo(OrdersSection);
