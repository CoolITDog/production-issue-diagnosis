import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-section">
          <h1 className="app-title">生产问题诊断平台</h1>
          <span className="app-subtitle">Production Issue Diagnosis Platform</span>
        </div>
        
        <nav className="main-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className={isActive('/')}>
                <span className="nav-icon">🏠</span>
                首页
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/project" className={isActive('/project')}>
                <span className="nav-icon">📁</span>
                项目管理
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/tickets" className={isActive('/tickets')}>
                <span className="nav-icon">📋</span>
                单据管理
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/diagnosis" className={isActive('/diagnosis')}>
                <span className="nav-icon">🔍</span>
                问题诊断
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};