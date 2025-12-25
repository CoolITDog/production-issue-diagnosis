import React, { useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { ProgressIndicator } from './ProgressIndicator';
import './ProgressIndicator.css';

export function ProgressPanel() {
  const { state, removeOperation } = useLoading();
  const [isExpanded, setIsExpanded] = useState(true);

  const activeOperations = state.operations.filter(op => op.status === 'running');
  const completedOperations = state.operations.filter(op => op.status === 'completed' || op.status === 'failed');

  if (activeOperations.length === 0 && completedOperations.length === 0) {
    return null;
  }

  const handleClearCompleted = () => {
    completedOperations.forEach(op => removeOperation(op.id));
  };

  return (
    <div className="progress-panel">
      <div className="progress-panel__header">
        <h3 className="progress-panel__title">
          Operations ({activeOperations.length} active, {completedOperations.length} completed)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {completedOperations.length > 0 && (
            <button
              className="progress-panel__toggle"
              onClick={handleClearCompleted}
              title="Clear completed operations"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            className="progress-panel__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              width="16" 
              height="16" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="progress-panel__content">
          {activeOperations.map(operation => (
            <div key={operation.id} className="progress-panel__operation">
              <ProgressIndicator 
                operationId={operation.id} 
                showDetails={false} 
                compact={true}
              />
            </div>
          ))}
          
          {completedOperations.map(operation => (
            <div key={operation.id} className="progress-panel__operation">
              <div className="progress-indicator progress-indicator--compact">
                <div className="progress-indicator__header">
                  <svg 
                    className={`progress-indicator__icon ${
                      operation.status === 'completed' 
                        ? 'progress-indicator__icon--success' 
                        : 'progress-indicator__icon--error'
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    {operation.status === 'completed' ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span className="progress-indicator__title">{operation.title}</span>
                  <span className="progress-indicator__percentage">
                    {operation.status === 'completed' ? 'Done' : 'Failed'}
                  </span>
                  <button
                    className="progress-panel__toggle"
                    onClick={() => removeOperation(operation.id)}
                    title="Remove"
                    style={{ marginLeft: '0.5rem' }}
                  >
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}