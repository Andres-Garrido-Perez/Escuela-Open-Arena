import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar eliminación?',
  itemName = '',
  itemType = 'elemento',
  description = null,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error during deletion:', err);
      setError(err.message || 'No se pudo eliminar el elemento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      maxWidth="max-w-md"
    >
      <div className="text-center pt-1 pb-1">
        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Trash2 className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {title}
        </h3>

        <div className="mt-2 text-xs text-slate-600 max-w-sm mx-auto leading-relaxed space-y-1">
          {description ? (
            <p>{description}</p>
          ) : (
            <p>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong className="text-slate-900 font-bold">{itemName || `este ${itemType}`}</strong>?
              Esta acción no se puede deshacer.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="text-xs font-bold"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            loading={loading}
            onClick={handleConfirm}
            className="text-xs font-bold shadow-xs"
            icon={Trash2}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
