import React, { useState, useEffect } from 'react';
import { performanceMetrics, memoryMonitor, browserCapabilities } from '../utils/performance';
import { useResponsive } from '../hooks/useResponsive';
import './PerformanceMonitor.css';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
}

export function PerformanceMonitor({ isVisible = false, onToggle }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<any>({});
  const [memoryUsage, setMemoryUsage] = useState({ bytes: 0, mb: 0, percentage: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setMetrics(performanceMetrics.getAllMetrics());
      setMemoryUsage(memoryMonitor.getCurrentUsage());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        className="performance-monitor__toggle"
        onClick={() => onToggle?.(true)}
        title="Show Performance Monitor"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getMemoryColor = (percentage: number) => {
    if (percentage < 50) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`performance-monitor ${isMobile ? 'performance-monitor--mobile' : ''}`}>
      <div className="performance-monitor__header">
        <h3 className="performance-monitor__title">Performance Monitor</h3>
        <div className="performance-monitor__controls">
          <button
            className="performance-monitor__control"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              width="16" 
              height="16" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="performance-monitor__control"
            onClick={() => {
              performanceMetrics.clear();
              memoryMonitor.reset();
            }}
            title="Clear Metrics"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="performance-monitor__control"
            onClick={() => onToggle?.(false)}
            title="Close"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="performance-monitor__summary">
        <div className="performance-monitor__metric">
          <span className="performance-monitor__metric-label">Memory</span>
          <div className="performance-monitor__memory-bar">
            <div 
              className="performance-monitor__memory-fill"
              style={{ 
                width: `${memoryUsage.percentage}%`,
                backgroundColor: getMemoryColor(memoryUsage.percentage)
              }}
            />
          </div>
          <span className="performance-monitor__metric-value">
            {formatBytes(memoryUsage.bytes)} ({memoryUsage.percentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="performance-monitor__details">
          <div className="performance-monitor__section">
            <h4 className="performance-monitor__section-title">Performance Metrics</h4>
            <div className="performance-monitor__metrics">
              {Object.entries(metrics).length === 0 ? (
                <p className="performance-monitor__no-data">No metrics available</p>
              ) : (
                Object.entries(metrics).map(([label, data]: [string, any]) => (
                  <div key={label} className="performance-monitor__metric-row">
                    <span className="performance-monitor__metric-name">{label}</span>
                    <div className="performance-monitor__metric-stats">
                      <span>Avg: {formatTime(data.avg)}</span>
                      <span>Min: {formatTime(data.min)}</span>
                      <span>Max: {formatTime(data.max)}</span>
                      <span>Count: {data.count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="performance-monitor__section">
            <h4 className="performance-monitor__section-title">Browser Capabilities</h4>
            <div className="performance-monitor__capabilities">
              <div className="performance-monitor__capability">
                <span>File System Access:</span>
                <span className={browserCapabilities.supportsFileSystemAccess ? 'supported' : 'not-supported'}>
                  {browserCapabilities.supportsFileSystemAccess ? '✓' : '✗'}
                </span>
              </div>
              <div className="performance-monitor__capability">
                <span>Web Workers:</span>
                <span className={browserCapabilities.supportsWebWorkers ? 'supported' : 'not-supported'}>
                  {browserCapabilities.supportsWebWorkers ? '✓' : '✗'}
                </span>
              </div>
              <div className="performance-monitor__capability">
                <span>Intersection Observer:</span>
                <span className={browserCapabilities.supportsIntersectionObserver ? 'supported' : 'not-supported'}>
                  {browserCapabilities.supportsIntersectionObserver ? '✓' : '✗'}
                </span>
              </div>
              <div className="performance-monitor__capability">
                <span>Hardware Concurrency:</span>
                <span>{browserCapabilities.hardwareConcurrency} cores</span>
              </div>
              <div className="performance-monitor__capability">
                <span>Device Memory:</span>
                <span>{browserCapabilities.maxMemory}MB</span>
              </div>
            </div>
          </div>

          <div className="performance-monitor__section">
            <h4 className="performance-monitor__section-title">Memory Details</h4>
            <div className="performance-monitor__memory-details">
              <div className="performance-monitor__memory-stat">
                <span>Current Usage:</span>
                <span>{formatBytes(memoryUsage.bytes)}</span>
              </div>
              <div className="performance-monitor__memory-stat">
                <span>Usage Percentage:</span>
                <span>{memoryUsage.percentage.toFixed(2)}%</span>
              </div>
              {(performance as any).memory && (
                <>
                  <div className="performance-monitor__memory-stat">
                    <span>JS Heap Used:</span>
                    <span>{formatBytes((performance as any).memory.usedJSHeapSize)}</span>
                  </div>
                  <div className="performance-monitor__memory-stat">
                    <span>JS Heap Total:</span>
                    <span>{formatBytes((performance as any).memory.totalJSHeapSize)}</span>
                  </div>
                  <div className="performance-monitor__memory-stat">
                    <span>JS Heap Limit:</span>
                    <span>{formatBytes((performance as any).memory.jsHeapSizeLimit)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}