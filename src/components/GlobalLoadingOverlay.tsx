import React from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { ProgressIndicator } from './ProgressIndicator';
import './ProgressIndicator.css';

export function GlobalLoadingOverlay() {
  const { state } = useLoading();

  if (!state.globalLoading && state.operations.length === 0) {
    return null;
  }

  const activeOperations = state.operations.filter(op => op.status === 'running');

  if (state.globalLoading && activeOperations.length === 0) {
    return (
      <div className="global-loading-overlay">
        <div className="global-loading-content">
          <div className="progress-indicator">
            <div className="progress-indicator__header">
              <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="progress-indicator__info">
                <h3 className="progress-indicator__title">Loading...</h3>
                <p className="progress-indicator__description">Please wait while we process your request</p>
              </div>
            </div>
            <div className="progress-indicator__bar">
              <div className="progress-indicator__fill" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeOperations.length === 1) {
    return (
      <div className="global-loading-overlay">
        <div className="global-loading-content">
          <ProgressIndicator operationId={activeOperations[0].id} showDetails={true} />
        </div>
      </div>
    );
  }

  return null;
}