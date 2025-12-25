import React, { useEffect, useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  operationId?: string;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProgressIndicator({ 
  operationId, 
  showDetails = true, 
  compact = false,
  className = '' 
}: ProgressIndicatorProps) {
  const { state, getOperation } = useLoading();
  const [elapsedTime, setElapsedTime] = useState(0);

  const operation = operationId ? getOperation(operationId) : state.operations.find(op => op.status === 'running');

  useEffect(() => {
    if (!operation || operation.status !== 'running') return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - operation.startTime.getTime();
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [operation]);

  if (!operation) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const getEstimatedTimeRemaining = () => {
    if (!operation.estimatedDuration || operation.progress === 0) return null;
    
    const elapsed = elapsedTime;
    const estimatedTotal = (elapsed / operation.progress) * 100;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return remaining;
  };

  const getOperationIcon = (type: string, status: string) => {
    if (status === 'completed') {
      return (
        <svg className="progress-indicator__icon progress-indicator__icon--success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (status === 'failed') {
      return (
        <svg className="progress-indicator__icon progress-indicator__icon--error" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }

    switch (type) {
      case 'file_upload':
        return (
          <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'git_clone':
        return (
          <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'code_parsing':
        return (
          <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'ai_analysis':
        return (
          <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="progress-indicator__icon progress-indicator__icon--spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  const estimatedRemaining = getEstimatedTimeRemaining();

  if (compact) {
    return (
      <div className={`progress-indicator progress-indicator--compact ${className}`}>
        <div className="progress-indicator__header">
          {getOperationIcon(operation.type, operation.status)}
          <span className="progress-indicator__title">{operation.title}</span>
          <span className="progress-indicator__percentage">{Math.round(operation.progress)}%</span>
        </div>
        <div className="progress-indicator__bar">
          <div 
            className="progress-indicator__fill"
            style={{ width: `${operation.progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`progress-indicator ${className}`}>
      <div className="progress-indicator__header">
        {getOperationIcon(operation.type, operation.status)}
        <div className="progress-indicator__info">
          <h3 className="progress-indicator__title">{operation.title}</h3>
          {operation.description && (
            <p className="progress-indicator__description">{operation.description}</p>
          )}
        </div>
        <div className="progress-indicator__stats">
          <span className="progress-indicator__percentage">{Math.round(operation.progress)}%</span>
          <span className="progress-indicator__time">
            {formatTime(elapsedTime)}
            {estimatedRemaining && (
              <span className="progress-indicator__remaining">
                / ~{formatTime(estimatedRemaining)} left
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="progress-indicator__bar">
        <div 
          className="progress-indicator__fill"
          style={{ width: `${operation.progress}%` }}
        />
      </div>

      {showDetails && operation.subOperations && operation.subOperations.length > 0 && (
        <div className="progress-indicator__sub-operations">
          {operation.subOperations.map(subOp => (
            <div key={subOp.id} className="progress-indicator__sub-operation">
              <div className="progress-indicator__sub-header">
                <span className={`progress-indicator__sub-status progress-indicator__sub-status--${subOp.status}`}>
                  {subOp.status === 'completed' ? '✓' : 
                   subOp.status === 'failed' ? '✗' : 
                   subOp.status === 'running' ? '⟳' : '○'}
                </span>
                <span className="progress-indicator__sub-title">{subOp.title}</span>
                <span className="progress-indicator__sub-percentage">{Math.round(subOp.progress)}%</span>
              </div>
              <div className="progress-indicator__sub-bar">
                <div 
                  className="progress-indicator__sub-fill"
                  style={{ width: `${subOp.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}