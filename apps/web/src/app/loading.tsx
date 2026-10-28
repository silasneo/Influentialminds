export default function Loading() {
  return (
    <div className="page-body" style={{ paddingTop: 160 }}>
      <div className="empty-state" aria-live="polite">
        <h2>Loading the archive</h2>
        <p>Fetching the latest conversations.</p>
      </div>
    </div>
  );
}
