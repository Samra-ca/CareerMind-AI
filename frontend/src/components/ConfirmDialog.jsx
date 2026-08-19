const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const ConfirmDialog = ({
  open,
  title = 'Confirm delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmIcon = 'delete',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="relative bg-surface-card border border-border-subtle rounded-2xl p-stack-lg w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-error/10 text-error flex items-center justify-center flex-shrink-0">
            <Icon name="warning" className="text-2xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-1">{title}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-stack-lg">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors border border-border-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-label-md text-label-md text-on-error bg-error hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <Icon name={confirmIcon} className="text-sm" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;