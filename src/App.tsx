import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { HomePage, ProjectPage, TicketsPage, DiagnosisPage } from './pages';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ErrorNotifications } from './components/ErrorNotifications';
import { GlobalLoadingOverlay } from './components/GlobalLoadingOverlay';
import { ProgressPanel } from './components/ProgressPanel';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import './App.css';
import './components/ErrorBoundary.css';

function App() {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(
    process.env.NODE_ENV === 'development'
  );

  return (
    <ErrorProvider>
      <LoadingProvider>
        <Provider store={store}>
          <ErrorBoundary>
            <Router>
              <div className="App">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/project" element={<ProjectPage />} />
                  <Route path="/tickets" element={<TicketsPage />} />
                  <Route path="/diagnosis" element={<DiagnosisPage />} />
                </Routes>
                <ErrorNotifications />
                <GlobalLoadingOverlay />
                <ProgressPanel />
                <PerformanceMonitor 
                  isVisible={showPerformanceMonitor}
                  onToggle={setShowPerformanceMonitor}
                />
              </div>
            </Router>
          </ErrorBoundary>
        </Provider>
      </LoadingProvider>
    </ErrorProvider>
  );
}

export default App;
