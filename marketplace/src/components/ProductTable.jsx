import ProductThumb from "./ProductThumb.jsx";
import RowActions from "./RowActions.jsx";
import { formatINR, getStatus } from "../utils/product";

export function StatusBadge({ product }) {
  const s = getStatus(product);
  return <span className={`badge badge--${s.key}`}>{s.label}</span>;
}

export default function ProductTable({ products, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="ptable">
        <caption className="sr-only">Product inventory</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Category</th>
            <th scope="col" className="num">Price</th>
            <th scope="col" className="num">Stock</th>
            <th scope="col">Unit</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="pcell">
                  <ProductThumb product={p} />
                  <span className="pcell__name">{p.name}</span>
                </div>
              </td>
              <td>{p.category}</td>
              <td className="num">{formatINR(p.price)}</td>
              <td className="num">{p.stock_quantity}</td>
              <td>{p.unit}</td>
              <td><StatusBadge product={p} /></td>
              <td className="actions"><RowActions product={p} onDelete={onDelete} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
