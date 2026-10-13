
import "../styles/logo.css";
import logoIcon from "../assets/icon.png";

export default function Logo({ light = false }) {
  return (
    <div className={`logo${light ? " logo--light" : ""}`}>
      <img
        className="logo__mark"
        src={logoIcon}
        alt=""
        aria-hidden="true"
      />

      <span className="logo__text">
        <strong>Pure Pail</strong>
        <small>Everyday Marketplace</small>
      </span>
    </div>
  );
}
