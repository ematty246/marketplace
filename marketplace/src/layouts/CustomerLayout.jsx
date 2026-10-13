import { Outlet } from "react-router-dom";
import CustomerHeader from "../components/customer/CustomerHeader.jsx";
import CustomerFooter from "../components/customer/CustomerFooter.jsx";
import MicButton from "../components/MicButton.jsx";

export default function CustomerLayout() {
  return (
    <div className="shop">
      <a href="#shop-main" className="skip-link">Skip to content</a>
      <CustomerHeader />
      <main id="shop-main" className="shop-main"><Outlet /></main>
      <CustomerFooter />
      <MicButton />
    </div>
  );
}
