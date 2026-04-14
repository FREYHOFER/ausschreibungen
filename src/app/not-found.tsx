import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="app-shell">
      <section className="panel">
        <p className="eyebrow">404</p>
        <h1>Ausschreibung nicht gefunden</h1>
        <p className="muted">
          Die angeforderte Detailseite existiert nicht oder wurde entfernt.
        </p>
        <Link className="inline-link" href="/">
          Zurueck zum Dashboard
        </Link>
      </section>
    </div>
  );
}
