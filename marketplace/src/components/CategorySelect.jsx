import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CATEGORIES } from "../constants/categories";

export default function CategorySelect({ id, value, onChange, invalid, describedBy, placeholder = "Select a category" }) {
  // Keep a legacy category (saved before this list existed) selectable so editing never loses it.
  const options = useMemo(() => (value && !CATEGORIES.includes(value) ? [value, ...CATEGORIES] : CATEGORIES), [value]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const typeRef = useRef({ text: "", timer: null });
  const listId = `${id}-listbox`;

  const openList = () => {
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };
  const choose = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e) => {
    const last = options.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      setActive((i) => (e.key === "ArrowDown" ? Math.min(last, i + 1) : Math.max(0, i - 1)));
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter" || e.key === " ") {
      if (e.key === " " && typeRef.current.text) return; // part of a type-ahead word
      e.preventDefault();
      open ? choose(options[active]) : openList();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // type-ahead: jump to the first category starting with the typed letters
      const t = typeRef.current;
      clearTimeout(t.timer);
      t.text += e.key.toLowerCase();
      t.timer = setTimeout(() => (t.text = ""), 700);
      const hit = options.findIndex((o) => o.toLowerCase().startsWith(t.text));
      if (hit >= 0) {
        if (!open) setOpen(true);
        setActive(hit);
      }
    }
  };

  return (
    <div className="cselect" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`input cselect__btn${value ? "" : " cselect__btn--empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={18} aria-hidden="true" className={open ? "cselect__chev cselect__chev--open" : "cselect__chev"} />
      </button>
      {open && (
        <ul className="cselect__list" id={listId} role="listbox" aria-label="Categories" ref={listRef}>
          {options.map((opt, i) => (
            <li
              key={opt}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={opt === value}
              className={`cselect__opt${i === active ? " cselect__opt--active" : ""}${opt === value ? " cselect__opt--selected" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(opt)}
            >
              <span>{opt}</span>
              {opt === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}