import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

export default function RowActions({ product, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="row-actions" ref={ref}>
      <button className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${product.name}`} onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="menu menu--right" role="menu">
          <Link role="menuitem" to={`/admin/products/${product.id}/edit`}>
            <Pencil size={16} /> Edit
          </Link>
          <button role="menuitem" className="menu__danger" onClick={() => { setOpen(false); onDelete(product); }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
