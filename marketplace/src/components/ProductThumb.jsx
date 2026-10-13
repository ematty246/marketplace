import { ImageOff } from "lucide-react";
import { productImage } from "../utils/product";

export default function ProductThumb({ product }) {
  const src = productImage(product);
  return src ? (
    <img className="thumb" src={src} alt={`${product.name} product`} loading="lazy" />
  ) : (
    <span className="thumb thumb--empty" role="img" aria-label="No image">
      <ImageOff size={18} />
    </span>
  );
}
