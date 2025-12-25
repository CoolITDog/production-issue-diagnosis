import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  showSidebar?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  sidebar, 
  showSidebar = false 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="main-layout">
      <Header />
      
      <div className="layout-body">
        {showSidebar && sidebar && (
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar}>
            {sidebar}
          </Sidebar>
        )}
        
        <main className={`main-content ${showSidebar ? 'with-sidebar' : ''}`}>
          <div className="content-container">
            {showSidebar && (
              <button 
                className="mobile-sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Open sidebar"
              >
                <span className="toggle-icon">☰</span>
                <span className="toggle-text">菜单</span>
              </button>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};