import { Trash2 } from "lucide-react";
import ProductImage from "./ProductImage.jsx";
import QuantitySelector from "./QuantitySelector.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { formatPaise } from "../../utils/money";

export default function CartItem({ item }) {
  const { setQty, remove } = useCart();
  return (
    <li className={`shop-line${item.unavailable ? " shop-line--off" : ""}`}>
      <ProductImage src={item.image} alt={item.name} className="shop-line__img" />
      <div className="shop-line__info">
        <strong>{item.name}</strong>
        <span>{item.unit ? `${item.unit} · ` : ""}{formatPaise(item.pricePaise)} each</span>
        {item.unavailable && <span className="badge badge--out">No longer available</span>}
      </div>
      <QuantitySelector value={item.quantity} max={Math.max(1, item.stock)} onChange={(q) => setQty(item.productId, q)} label={item.name} disabled={item.unavailable} />
      <strong className="shop-line__total">{item.unavailable ? "—" : formatPaise(item.pricePaise * item.quantity)}</strong>
      <button className="icon-btn" onClick={() => remove(item.productId)} aria-label={`Remove ${item.name}`}><Trash2 size={18} /></button>
    </li>
  );
}
