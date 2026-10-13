import ProductCard from "./ProductCard.jsx";

export default function ProductGrid({ products }) {
  return (
    <div className="shop-grid">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
