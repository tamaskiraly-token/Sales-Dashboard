import { useState, useEffect } from 'react';

export type SalesTabId =
  | 'overview'
  | 'forecast'
  | 'pipeline'
  | 'accounts'
  | 'lostdeals'
  | '2026q1'
  | '2026q2'
  | '2026q3'
  | '2026q4';

const TABS: { id: SalesTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'lostdeals', label: 'Lost Deals' },
  { id: '2026q1', label: '2026 Q1' },
  { id: '2026q2', label: '2026 Q2' },
  { id: '2026q3', label: '2026 Q3' },
  { id: '2026q4', label: '2026 Q4' },
];

interface SidebarProps {
  activeTab: SalesTabId;
  onTabChange: (tab: SalesTabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    document.body.classList.add('sales-mobile-menu-open');
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.classList.remove('sales-mobile-menu-open');
    };
  }, [menuOpen]);

  const handleTabClick = (id: SalesTabId) => {
    onTabChange(id);
    setMenuOpen(false);
  };

  return (
    <aside className={`sales-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="sales-sidebar-topbar">
        <div className="sales-sidebar-brand">
          <img src="/token-logo.png" alt="Token" className="sales-sidebar-logo" />
          <div>
            <div className="sales-sidebar-title">Sales</div>
            <div className="sales-sidebar-subtitle">Commercial Performance</div>
          </div>
        </div>
        <button
          type="button"
          className="sales-sidebar-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className="sales-sidebar-menu-icon" aria-hidden>{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>
      <div
        className="sales-sidebar-overlay"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <div className="sales-sidebar-drawer">
        <div className="sales-sidebar-brand sales-sidebar-drawer-brand">
          <img src="/token-logo.png" alt="Token" className="sales-sidebar-logo" />
          <div>
            <div className="sales-sidebar-title">Sales</div>
            <div className="sales-sidebar-subtitle">Commercial Performance</div>
          </div>
        </div>
        <nav className="sales-sidebar-nav">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`sales-sidebar-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => handleTabClick(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
