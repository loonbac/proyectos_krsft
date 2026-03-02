import { memo } from 'react';
import { WrenchScrewdriverIcon, PlusIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';

const TIME_UNITS = ['Día(s)', 'Semana(s)', 'Mes(es)'];

/**
 * ServiceForm – Especificación de Servicios form.
 * Posts type='service' to the same /order endpoint as materials.
 * Services start as 'draft' and require manager approval → go to Compras.
 */
function ServiceForm({ serviceForm, onFormChange, savingService, onCreateService }) {
    const handleChange = (field) => (e) => {
        const raw = e.target.value;
        onFormChange({
            ...serviceForm,
            [field]: field === 'time_value' ? (parseInt(raw) || 1) : raw,
        });
    };

    const canSubmit = serviceForm.description.trim() && serviceForm.time_value > 0 && serviceForm.location.trim();

    return (
        <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                <WrenchScrewdriverIcon className="size-5 text-primary" />
                Especificación de Servicio
            </h3>
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                    {/* Descripción — ocupa 2 columnas */}
                    <div className="col-span-2">
                        <Input
                            label="Descripción del Servicio"
                            placeholder="Descripción del servicio requerido..."
                            value={serviceForm.description}
                            onChange={handleChange('description')}
                        />
                    </div>
                    {/* Lugar */}
                    <Input
                        label="Lugar"
                        placeholder="Lugar donde se realizará..."
                        value={serviceForm.location}
                        onChange={handleChange('location')}
                    />
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                    {/* Tiempo: número + unidad */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Tiempo</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                value={serviceForm.time_value}
                                onChange={handleChange('time_value')}
                                className="w-20 rounded border border-gray-300 px-2 py-[7px] text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <select
                                value={serviceForm.time_unit}
                                onChange={handleChange('time_unit')}
                                className="flex-1 rounded border border-gray-300 px-2 py-[7px] text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {TIME_UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        variant="primary"
                        onClick={onCreateService}
                        disabled={savingService || !canSubmit}
                        loading={savingService}
                        className="gap-2"
                    >
                        <PlusIcon className="size-4" />
                        {savingService ? 'Enviando...' : 'Agregar Servicio'}
                    </Button>
                </div>
            </div>
        </section>
    );
}

export default memo(ServiceForm);
