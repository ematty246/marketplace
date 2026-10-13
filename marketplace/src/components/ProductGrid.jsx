import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import ProductImage from "./ProductImage.jsx";
import QuantitySelector from "./QuantitySelector.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { formatPaise, toPaise } from "../../utils/money";

export default function ProductCard({ product }) {
  const { add, quantityOf } = useCart();
  const [qty, setQty] = useState(1);
  const stock = Math.max(0, parseInt(product.stock_quantity, 10) || 0);
  const buyable = product.is_available === true && stock > 0;
  const inCart = quantityOf(product.id);
  const room = stock - inCart;

  const handleAdd = () => {
    const res = add(product, qty);
    if (!res.ok) {
      toast.error(res.reason === "max" ? "You already have all available stock in your cart." : "This product is unavailable.");
      return;
    }
    toast.success(res.capped ? `Added ${res.added} (limited by stock).` : `${product.name} added to cart.`);
    setQty(1);
  };

  return (
    <article className="shop-card">
      <ProductImage src={product.image_url ?? product.image} alt={product.name} className="shop-card__img" />
      <div className="shop-card__body">
        {product.category && <span className="shop-chip">{product.category}</span>}
        <h3>{product.name}</h3>
        {product.description && <p className="shop-card__desc">{product.description}</p>}
        <div className="shop-card__price">
          <strong>{formatPaise(toPaise(product.price))}</strong>
          {product.unit && <span>/ {product.unit}</span>}
        </div>
        <p className={`shop-card__stock${!buyable ? " shop-card__stock--out" : stock <= 5 ? " shop-card__stock--low" : ""}`}>
          {!buyable ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : `${stock} in stock`}
        </p>
        <div className="shop-card__actions">
          <QuantitySelector value={Math.min(qty, Math.max(1, room))} max={Math.max(1, room)} onChange={setQty} label={product.name} disabled={!buyable || room <= 0} />
          <button className="btn btn--primary btn--sm" onClick={handleAdd} disabled={!buyable || room <= 0}>
            <ShoppingCart size={16} /> {!buyable ? "Unavailable" : room <= 0 ? "In cart" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
