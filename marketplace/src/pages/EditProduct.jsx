import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import ProductForm from "../components/ProductForm.jsx";
import { useInventory } from "../hooks/useInventory";
import { updateProduct } from "../services/productService";
import { getErrorMessage } from "../api/axios";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading, error, reload } = useInventory();
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => String(p.id) === id);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const save = async (formData) => {
    setBusy(true);
    try {
      await updateProduct(id, formData);
      toast.success("Product updated.");
      navigate("/admin/products");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2 className="page__title">{product ? `Edit ${product.name}` : "Edit product"}</h2>
          <p className="page__sub">Update details, stock or the product image.</p>
        </div>
      </div>
      {loading ? (
        <div className="skeleton skeleton--block" aria-busy="true" />
      ) : error ? (
        <div className="alert alert--error" role="alert">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button className="btn btn--secondary btn--sm" onClick={reload}>Try again</button>
        </div>
      ) : !product ? (
        <div className="empty">
          <h3>Product not found</h3>
          <p>It may have been deleted.</p>
          <Link to="/admin/products" className="btn btn--primary">Back to catalog</Link>
        </div>
      ) : (
        <ProductForm key={product.id} initial={product} categories={categories} submitting={busy} submitLabel="Save changes" onSubmit={save} />
      )}
    </div>
  );
}
