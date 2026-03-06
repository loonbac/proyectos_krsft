import { memo } from 'react';
import {
  DocumentPlusIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Input from './ui/Input';

/**
 * MaterialForm – Material specification form + import/download buttons (detail view).
 */
function MaterialForm({
  materialForm,
  onFormChange,
  nextItemNumber,
  savingOrder,
  onCreateOrder,
  importingFile,
  onDownloadTemplate,
  onImportExcel,
}) {
  const handleChange = (field) => (e) => {
    const raw = e.target.value;
    if (field === 'qty') {
      onFormChange({ ...materialForm, qty: parseInt(raw) || 1 });
    } else {
      onFormChange({ ...materialForm, [field]: raw });
    }
  };

  return (
    <section className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
        <DocumentPlusIcon className="size-5 text-primary" />
        Especificación de Material
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Cantidad *" type="number" min="1" value={materialForm.qty} onChange={handleChange('qty')} />
          <Input label="Tipo de Material *" placeholder="Ej: ángulo, brida..." value={materialForm.material_type} onChange={handleChange('material_type')} />
          <Input label="Especificación Técnica" placeholder="Ej: ángulos de 2&quot; x 3/16&quot;" value={materialForm.description} onChange={handleChange('description')} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Medida" placeholder="Ej: und, kg, m..." value={materialForm.diameter} onChange={handleChange('diameter')} />
          <Input label="Tipo de Conexión" placeholder="Ej: soldable, roscado..." value={materialForm.series} onChange={handleChange('series')} />
          <Input label="Observaciones" placeholder="Notas adicionales..." value={materialForm.notes} onChange={handleChange('notes')} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button variant="primary" onClick={onCreateOrder} disabled={savingOrder || !materialForm.material_type || !materialForm.qty} loading={savingOrder} className="gap-2">
            <PlusIcon className="size-4" />
            {savingOrder ? 'Enviando...' : 'Agregar Material'}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onDownloadTemplate} className="gap-1.5">
              <ArrowDownTrayIcon className="size-4" />
              Plantilla
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200">
              <ArrowUpTrayIcon className="size-4" />
              {importingFile ? 'Importando...' : 'Importar Excel'}
              <input type="file" accept=".xlsx,.xls" onChange={onImportExcel} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(MaterialForm);
