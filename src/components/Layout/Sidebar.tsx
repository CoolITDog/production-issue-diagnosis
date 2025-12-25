import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, children }) => {
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onToggle} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
            <span className="toggle-icon">{isOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        <div className="sidebar-content">
          {children}
        </div>
      </aside>
    </>
  );
};