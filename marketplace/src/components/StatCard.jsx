export default function StatCard({ label, value, icon: Icon, tone = "green", loading }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div>
        <p className="stat__label">{label}</p>
        {loading ? <div className="skeleton skeleton--stat" aria-label="Loading" /> : <p className="stat__value">{value.toLocaleString("en-IN")}</p>}
      </div>
    </div>
  );
}
