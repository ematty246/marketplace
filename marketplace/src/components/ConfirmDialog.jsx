import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export default function ConfirmDialog({ open, title, children, confirmLabel = "Delete", busy, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onClose={onCancel} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog__body">
        <span className="dialog__icon" aria-hidden="true"><Trash2 size={22} /></span>
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog__text">{children}</div>
      </div>
      <div className="dialog__actions">
        <button className="btn btn--secondary" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
        <button className="btn btn--danger" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : confirmLabel}</button>
      </div>
    </dialog>
  );
}
