import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/Layout';
import './HomePage.css';

export const HomePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="home-page">
        <div className="hero-section">
          <h1 className="hero-title">生产问题诊断平台</h1>
          <p className="hero-subtitle">
            结合AI智能分析，快速定位和诊断生产环境问题
          </p>
          <div className="hero-actions">
            <Link to="/project" className="cta-button primary">
              开始诊断
            </Link>
            <Link to="/tickets" className="cta-button secondary">
              管理单据
            </Link>
          </div>
        </div>

        <div className="features-section">
          <h2 className="section-title">核心功能</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3 className="feature-title">项目管理</h3>
              <p className="feature-description">
                支持文件上传和Git仓库集成，轻松导入项目代码
              </p>
              <Link to="/project" className="feature-link">
                开始使用 →
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">单据管理</h3>
              <p className="feature-description">
                创建和管理生产问题单据，记录输入输出数据
              </p>
              <Link to="/tickets" className="feature-link">
                管理单据 →
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3 className="feature-title">智能诊断</h3>
              <p className="feature-description">
                AI驱动的问题分析，提供准确的诊断结果和解决方案
              </p>
              <Link to="/diagnosis" className="feature-link">
                开始诊断 →
              </Link>
            </div>
          </div>
        </div>

        <div className="workflow-section">
          <h2 className="section-title">使用流程</h2>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">导入项目</h3>
                <p className="step-description">
                  通过文件上传或Git仓库导入需要分析的项目代码
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">创建单据</h3>
                <p className="step-description">
                  记录生产问题的详细信息，包括输入输出数据
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">AI诊断</h3>
                <p className="step-description">
                  AI模型分析代码和问题信息，生成诊断报告
                </p>
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">查看结果</h3>
                <p className="step-description">
                  获取详细的问题分析和解决方案建议
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};