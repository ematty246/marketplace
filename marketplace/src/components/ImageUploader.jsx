import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { validateImage } from "../utils/product";

export default function ImageUploader({ file, existingUrl, onChange, error, onError }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    if (!f) return;
    const err = validateImage(f);
    onError(err);
    if (!err) onChange(f);
  };

  const shown = preview || existingUrl;

  return (
    <div>
      <div
        className={`uploader${drag ? " uploader--drag" : ""}${error ? " uploader--error" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
      >
        {shown ? (
          <img src={shown} alt="Product preview" className="uploader__preview" />
        ) : (
          <div className="uploader__empty">
            <ImagePlus size={30} aria-hidden="true" />
            <p>Drag an image here</p>
            <small>JPEG, PNG or WebP · up to 5 MB</small>
          </div>
        )}
      </div>
      <input ref={inputRef} id="product-image" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="uploader__actions">
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()}>
          {shown ? "Replace image" : "Choose image"}
        </button>
        {file && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { onChange(null); onError(""); }}>
            <X size={15} /> {existingUrl ? "Keep current image" : "Remove"}
          </button>
        )}
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  );
}
