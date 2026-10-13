import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { assetUrl } from "../../utils/assets";

export default function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);
  useEffect(() => setFailed(false), [src]);

  if (!url || failed) {
    return (
      <div className={`shop-img shop-img--empty ${className}`} role="img" aria-label="No image available">
        <ImageOff size={26} aria-hidden="true" />
      </div>
    );
  }
  return <img className={`shop-img ${className}`} src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
