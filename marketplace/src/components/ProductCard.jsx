import ProductThumb from "./ProductThumb.jsx";
import RowActions from "./RowActions.jsx";
import { StatusBadge } from "./ProductTable.jsx";
import { formatINR } from "../utils/product";

export default function ProductCard({ product, onDelete }) {
  return (
    <article className="pcard">
      <ProductThumb product={product} />
      <div className="pcard__body">
        <h3>{product.name}</h3>
        <p className="pcard__meta">{product.category} · {product.unit}</p>
        <p className="pcard__price">{formatINR(product.price)}</p>
        <div className="pcard__foot">
          <StatusBadge product={product} />
          <span className="pcard__stock">{product.stock_quantity} in stock</span>
        </div>
      </div>
      <RowActions product={product} onDelete={onDelete} />
    </article>
  );
}
