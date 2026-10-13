import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Save } from "lucide-react";
import ImageUploader from "./ImageUploader.jsx";
import CategorySelect from "./CategorySelect.jsx";
import AiProductAssistant from "./AiProductAssistant.jsx";
import { buildFormData, productImage, validateProduct } from "../utils/product";

const UNIT_TYPES = ["g", "kg", "ml", "l", "pcs"];

// "250 g" -> { qty: "250", type: "g" }. Unrecognised legacy units start blank.
function parseUnit(unit = "") {
  const m = /^(\d+)\s*(g|kg|ml|l|pcs)$/i.exec(unit.trim());
  return m ? { qty: m[1], type: m[2].toLowerCase() } : { qty: "", type: "g" };
}

const EMPTY = { name: "", category: "", description: "", price: "", stock_quantity: "", unit: "", is_available: true };

function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && <p className="field__error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

export default function ProductForm({ initial, submitting, submitLabel, onSubmit }) {
  const [values, setValues] = useState(() =>
    initial
      ? {
          name: initial.name ?? "",
          category: initial.category ?? "",
          description: initial.description ?? "",
          price: String(initial.price ?? ""),
          stock_quantity: String(initial.stock_quantity ?? ""),
          unit: initial.unit ?? "",
          is_available: initial.is_available === true,
        }
      : EMPTY
  );
  const parsedUnit = initial ? parseUnit(initial.unit) : { qty: "", type: "g" };
  const [unitQty, setUnitQty] = useState(parsedUnit.qty);
  const [unitType, setUnitType] = useState(parsedUnit.type);
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [errors, setErrors] = useState({});

  function applyAiDraft(draft) {
    setValues((prev) => ({
      ...prev,
      name: draft.name || prev.name,
      category: draft.category || prev.category,
      description: draft.description || prev.description,
      price: draft.price !== "" && draft.price != null ? String(draft.price) : prev.price,
      stock_quantity: draft.stock_quantity !== "" && draft.stock_quantity != null ? String(draft.stock_quantity) : prev.stock_quantity,
      is_available: typeof draft.is_available === "boolean" ? draft.is_available : prev.is_available,
    }));
    const m = /^(\d+)\s*(g|kg|ml|l|pcs)$/i.exec(String(draft.unit || "").trim());
    if (m) {
      setUnitQty(m[1]);
      setUnitType(m[2].toLowerCase());
    }
    setErrors({});
  }

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const props = (k) => ({ id: k, value: values[k], onChange: set(k), "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  const stepQty = (delta) => setUnitQty((q) => String(Math.max(1, (parseInt(q, 10) || 0) + delta)));
  const unit = unitQty ? `${unitQty} ${unitType}` : "";

  const submit = (e) => {
    e.preventDefault();
    const full = { ...values, unit };
    const errs = validateProduct(full, image);
    if (/^[1-9]\d*$/.test(unitQty)) delete errs.unit;
    else errs.unit = "Enter a whole number of 1 or more, e.g. 250 g.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs).find((k) => k !== "image") || "product-image")?.focus();
      return;
    }
    onSubmit(buildFormData(full, image));
  };

  return (
    <form className="pform" onSubmit={submit} noValidate>
      <AiProductAssistant onDraft={applyAiDraft} />
      <div className="pform__main">
        <section className="card">
          <h2 className="card__title">Product information</h2>
          <Field id="name" label="Product name" error={errors.name}>
            <input className="input" maxLength={200} placeholder="e.g. Farm fresh toned milk" {...props("name")} />
          </Field>
          <Field id="category" label="Category" error={errors.category}>
            <CategorySelect
              id="category"
              value={values.category}
              onChange={(c) => setValues((v) => ({ ...v, category: c }))}
              invalid={!!errors.category}
              describedBy={errors.category ? "category-err" : undefined}
            />
          </Field>
          <Field id="description" label="Description" error={errors.description} hint={`${values.description.length} / 5,000`}>
            <textarea className="input" rows={5} {...props("description")} />
          </Field>
        </section>
        <section className="card">
          <h2 className="card__title">Pricing and inventory</h2>
          <div className="grid-2">
            <Field id="price" label="Price (₹)" error={errors.price}>
              <input className="input" inputMode="decimal" placeholder="0.00" {...props("price")} />
            </Field>
            <Field id="stock_quantity" label="Stock quantity" error={errors.stock_quantity}>
              <input className="input" inputMode="numeric" placeholder="0" {...props("stock_quantity")} />
            </Field>
          </div>
          <Field id="unit" label="Unit (pack size)" error={errors.unit} hint="Use + / − or the arrow keys to change in steps of 1: 1 g, 2 g, 3 g…">
            <div className="unit-stepper">
              <button type="button" className="icon-btn unit-stepper__btn" onClick={() => stepQty(-1)} aria-label="Decrease quantity by 1">
                <Minus size={18} />
              </button>
              <input
                id="unit"
                className="input unit-stepper__input"
                inputMode="numeric"
                placeholder="250"
                value={unitQty}
                onChange={(e) => setUnitQty(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); stepQty(1); }
                  if (e.key === "ArrowDown") { e.preventDefault(); stepQty(-1); }
                }}
                aria-invalid={!!errors.unit}
                aria-describedby={errors.unit ? "unit-err" : undefined}
              />
              <button type="button" className="icon-btn unit-stepper__btn" onClick={() => stepQty(1)} aria-label="Increase quantity by 1">
                <Plus size={18} />
              </button>
              <select className="input unit-stepper__type" value={unitType} onChange={(e) => setUnitType(e.target.value)} aria-label="Unit type">
                {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {initial?.unit && !unitQty && <p className="field__hint">Current unit: {initial.unit}. Enter a new pack size to replace it.</p>}
          </Field>
          <label className="switch">
            <input type="checkbox" role="switch" checked={values.is_available} onChange={(e) => setValues((v) => ({ ...v, is_available: e.target.checked }))} />
            <span className="switch__track" aria-hidden="true" />
            <span>
              <strong>Available for customers</strong>
              <small>Products with zero stock are still shown as out of stock.</small>
            </span>
          </label>
        </section>
      </div>
      <aside className="pform__side">
        <section className="card">
          <h2 className="card__title">Product image</h2>
          <ImageUploader file={image} existingUrl={productImage(initial)} onChange={setImage} error={errors.image || imageError} onError={setImageError} />
        </section>
        <div className="pform__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            <Save size={17} /> {submitting ? "Saving…" : submitLabel}
          </button>
          <Link to="/admin/products" className="btn btn--secondary">Cancel</Link>
        </div>
      </aside>
    </form>
  );
}