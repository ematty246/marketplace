export default function CategoryFilter({ categories, value, onChange }) {
  return (
    <div className="shop-cats" role="group" aria-label="Filter by category">
      {["All", ...categories].map((c) => {
        const on = (c === "All" && !value) || c === value;
        return (
          <button key={c} type="button" className={`shop-cat${on ? " shop-cat--on" : ""}`} aria-pressed={on} onClick={() => onChange(c === "All" ? "" : c)}>
            {c}
          </button>
        );
      })}
    </div>
  );
}
