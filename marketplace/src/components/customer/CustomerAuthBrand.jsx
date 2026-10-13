import { Leaf, Mic, ShoppingBasket, Truck } from "lucide-react";
import Logo from "../Logo.jsx";

// Same markup and classes as the admin brand panel, so auth.css styles it identically.
const FEATURES = [
  { icon: ShoppingBasket, title: "Everyday essentials", text: "Groceries, dairy, pantry and more" },
  { icon: Leaf, title: "Fresh and trusted", text: "Quality products, carefully stocked" },
  { icon: Truck, title: "Cash on delivery", text: "Pay when your order arrives" },
  { icon: Mic, title: "Accessible shopping", text: "Designed for future voice navigation" },
];

export default function CustomerAuthBrand() {
  return (
    <section className="brand-panel" aria-label="Pure Pail marketplace">
      <Logo light />

      <div className="brand-panel__copy">
        <span className="brand-panel__eyebrow">YOUR DAILY MARKETPLACE</span>
        <h2>
          Fresh essentials.
          <span> Delivered to your door.</span>
        </h2>
        <p>Browse dairy and groceries, order in minutes and keep track of everything in one convenient place.</p>

        <div className="brand-panel__features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div className="brand-panel__feature" key={title}>
              <span className="brand-panel__feature-icon"><Icon size={20} aria-hidden="true" /></span>
              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="brand-panel__drop brand-panel__drop--a" aria-hidden="true" />
      <div className="brand-panel__drop brand-panel__drop--b" aria-hidden="true" />
    </section>
  );
}