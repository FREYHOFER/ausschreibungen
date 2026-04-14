import Link from "next/link";

interface AppHeaderProps {
  subtitle: string;
}

export function AppHeader({ subtitle }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Tender Copilot fuer IT-Dienstleister</p>
        <h1>Vergabe Radar MVP</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <nav className="topbar-nav" aria-label="Hauptnavigation">
        <Link href="/">Dashboard</Link>
        <Link href="/company">Profil-Simulator</Link>
      </nav>
    </header>
  );
}
