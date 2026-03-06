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
    isSupervisor,
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
        <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                <WrenchScrewdriverIcon className="size-5 text-primary" />
                Servicios Solicitados
            </h3>

            {serviceOrders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No hay servicios solicitados aún</p>
            ) : (
                <div className="space-y-3">
                    {/* Collapsible group — "Servicios Manuales" */}
                    <div className="rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                        {/* Group header */}
                        <div
                            role="button"
                            tabIndex={0}
                            className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                                }`}
                            onClick={() => setIsExpanded((v) => !v)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded((v) => !v); } }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <ChevronRightIcon className={`size-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                <WrenchScrewdriverIcon className="size-4 shrink-0 text-gray-400" />
                                <span className="truncate font-medium text-gray-700">Servicios Manuales</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {/* Bulk approve buttons (manager/admin only) */}
                                {!isSupervisor && !readOnly && draftServices.length > 0 && (
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
                                <table className="w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {!isSupervisor && !readOnly && (
                                                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 w-10">
                                                    <input type="checkbox" disabled className="rounded border-gray-300" />
                                                </th>
                                            )}
                                            <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 w-16 whitespace-nowrap">ITEM</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">DESCRIPCIÓN</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">TIEMPO</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">LUGAR</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ESTADO</th>
                                            {!isSupervisor && !readOnly && (
                                                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">ACCIONES</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {serviceOrders.map((order) => {
                                            const isDraft = order.status === 'draft';
                                            const isSelected = isServiceSelected(order.id);
                                            const timeValue = Array.isArray(order.materials) && order.materials[0]
                                                ? order.materials[0].qty
                                                : '—';
                                            const timeUnit = order.unit || '';
                                            const location = order.notes || '—';

                                            return (
                                                <tr
                                                    key={order.id}
                                                    className={`transition-colors ${isDraft && !isSupervisor && !readOnly ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                    onClick={() => isDraft && !isSupervisor && !readOnly && toggleServiceSelection(order)}
                                                >
                                                    {!isSupervisor && !readOnly && (
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
                                                    <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap font-medium">
                                                        {order.item_number || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-left text-gray-700">{order.description}</td>
                                                    <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                                                        {timeValue} {timeUnit}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">{location}</td>
                                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                                        <Badge variant={getOrderBadgeVariant(order)}>
                                                            {getOrderStatusLabel(order)}
                                                        </Badge>
                                                    </td>
                                                    {!isSupervisor && !readOnly && (
                                                        <td className="px-3 py-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            {isDraft ? (
                                                                <div className="flex justify-center gap-2">
                                                                    <button
                                                                        onClick={() => onApproveService(order.id)}
                                                                        title="Aprobar"
                                                                        className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-7 py-1 text-white transition-colors hover:bg-emerald-600 shadow-sm"
                                                                    >
                                                                        <CheckIcon className="size-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onRejectService(order.id)}
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
                </div>
            )}
        </section>
    );
}

export default memo(ServicesSection);
