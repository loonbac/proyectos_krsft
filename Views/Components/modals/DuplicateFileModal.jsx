import { memo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * DuplicateFileModal – Handles duplicate file import warning.
 * Shows the proposed sequential rename so the user knows what name will be used.
 */
function DuplicateFileModal({
  open,
  onClose,
  duplicateData,
  importing,
  onConfirmRename,
}) {
  const originalName = duplicateData?.originalFilename || '';
  const proposedName = duplicateData?.proposedFilename || '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archivo Duplicado"
      titleIcon={<ExclamationTriangleIcon className="size-5 text-primary" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirmRename(true)} disabled={importing} loading={importing}>
            {importing ? 'Importando...' : 'Renombrar e Importar'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        El archivo <strong>"{originalName}"</strong> ya fue importado anteriormente en este proyecto.
      </p>
      {proposedName && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Se renombrará automáticamente a: <strong>"{proposedName}"</strong>
          </p>
        </div>
      )}
      <p className="mt-2 text-sm text-gray-500">
        Los materiales se importarán bajo el nuevo nombre para evitar conflictos con la lista existente.
      </p>
    </Modal>
  );
}

export default memo(DuplicateFileModal);
