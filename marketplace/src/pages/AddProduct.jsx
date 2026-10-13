import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductForm from "../components/ProductForm.jsx";
import { useInventory } from "../hooks/useInventory";
import { createProduct } from "../services/productService";
import { getErrorMessage } from "../api/axios";

export default function AddProduct() {
  const navigate = useNavigate();
  const { products } = useInventory();
  const [busy, setBusy] = useState(false);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const save = async (formData) => {
    setBusy(true);
    try {
      await createProduct(formData);
      toast.success("Product added to the catalog.");
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
          <h2 className="page__title">Add a product</h2>
          <p className="page__sub">Create a new listing for the marketplace.</p>
        </div>
      </div>
      <ProductForm categories={categories} submitting={busy} submitLabel="Save product" onSubmit={save} />
    </div>
  );
}
