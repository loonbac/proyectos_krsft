import { memo, useState } from 'react';
import {
    WrenchScrewdriverIcon,
    ChevronRightIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { getOrderBadgeVariant, getOrderStatusLabel } from '../utils';

/**
 * ServicesSection – mirrors OrdersSection structure.
 * All manual services are grouped under a single collapsible "Servicios Manuales" entry.
 */
function ServicesSection({
    serviceOrders,
    selectedServices,
    canApprove,
    readOnly,
    onApproveAll,
    onApproveSelected,
    onApproveService,
    onRejectService,
    isServiceSelected,
    toggleServiceSelection,
    getSelectedServiceCount,
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const draftServices = serviceOrders.filter((o) => o.status === 'draft');
    const selectedCount = getSelectedServiceCount();

    // Summary badges — mirror OrdersSection
    const paidCount = serviceOrders.filter((o) => o.payment_confirmed).length;
    const allPaid = serviceOrders.length > 0 && paidCount === serviceOrders.length;

    return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-900">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <WrenchScrewdriverIcon className="size-[15.54px] text-primary" />
          </span>
          Servicios Solicitados
        </h3>
      </div>

      {serviceOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-50">
            <WrenchScrewdriverIcon className="size-6 text-gray-300" />
          </span>
          <p className="mt-3 text-sm text-gray-400">No hay servicios solicitados aún</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {/* Collapsible group — "Servicios Manuales" */}
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            {/* Group header */}
            <div
              role="button"
              tabIndex={0}
              className={`flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-sm transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'}`}
              onClick={() => setIsExpanded((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded((v) => !v); } }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRightIcon className={`size-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <span className="rounded-full bg-gray-100 p-1.5 hidden sm:inline-flex"><WrenchScrewdriverIcon className="size-3.5 shrink-0 text-gray-500" /></span>
                <strong className="truncate font-medium text-gray-800">Servicios Manuales</strong>
              </div>

              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {canApprove && !readOnly && draftServices.length > 0 && (
                  <>
                    {selectedCount > 0 && (
                      <Button variant="success" size="sm" onClick={onApproveSelected}>
                        Aprobar {selectedCount}
                      </Button>
                    )}
                    <Button variant="success" size="sm" onClick={onApproveAll}>
                      Aprobar Todo ({draftServices.length})
                    </Button>
                  </>
                )}
                <Badge variant="gray">{serviceOrders.length} items</Badge>
                <Badge variant={allPaid ? 'blue' : 'amber'}>
                  {allPaid ? 'Pagado' : `${paidCount}/${serviceOrders.length}`}
                </Badge>
              </div>
            </div>

            {/* Expanded table */}
            {isExpanded && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                  <thead className="ltr:text-left rtl:text-right">
                    <tr>
                      {canApprove && !readOnly && (
                        <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 w-10 text-center">
                          <input type="checkbox" disabled className="rounded border-gray-300" />
                        </th>
                      )}
                      <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center w-16">ITEM</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">DESCRIPCIÓN</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">TIEMPO</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">LUGAR</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">ESTADO</th>
                      {canApprove && !readOnly && (
                        <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-center">ACCIONES</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {serviceOrders.map((order) => {
                      const isDraft = order.status === 'draft';
                      const isSelected = isServiceSelected(order.id);
                      const timeValue = Array.isArray(order.materials) && order.materials[0]
                        ? order.materials[0].qty : '—';
                      const timeUnit = order.unit || '';
                      const location = order.notes || '—';

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors ${isDraft && canApprove && !readOnly ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                          onClick={() => isDraft && canApprove && !readOnly && toggleServiceSelection(order)}
                        >
                          {canApprove && !readOnly && (
                            <td className="whitespace-nowrap px-4 py-2 text-center">
                              <input type="checkbox" checked={isSelected} onChange={() => { }} disabled={!isDraft} className="rounded border-gray-300 pointer-events-none" />
                            </td>
                          )}
                          <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700 font-medium">{order.item_number || '—'}</td>
                          <td className="px-4 py-2 text-left text-gray-700">{order.description}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-center text-gray-700">{timeValue} {timeUnit}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-center text-gray-500 truncate max-w-[150px]" title={location}>{location}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-center">
                            <Badge variant={getOrderBadgeVariant(order)}>{getOrderStatusLabel(order)}</Badge>
                          </td>
                          {canApprove && !readOnly && (
                            <td className="whitespace-nowrap px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              {isDraft ? (
                                <div className="flex justify-center gap-1.5">
                                  <button onClick={() => onApproveService(order.id)} title="Aprobar"
                                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-white transition-colors hover:bg-emerald-600">
                                    <CheckIcon className="size-4" />
                                  </button>
                                  <button onClick={() => onRejectService(order.id)} title="Rechazar"
                                    className="inline-flex items-center justify-center rounded-lg bg-red-500 px-3 py-1.5 text-white transition-colors hover:bg-red-600">
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
        </div>
      )}
    </section>
  );
}

export default memo(ServicesSection);

