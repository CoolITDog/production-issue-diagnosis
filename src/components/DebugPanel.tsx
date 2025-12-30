import React, { useState } from 'react';

interface DebugPanelProps {
  show?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ show = false }) => {
  const [isVisible, setIsVisible] = useState(show);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Debug
      </button>
    );
  }

  const checkLocalStorage = () => {
    const currentProject = localStorage.getItem('currentProject');
    const uploadedProjects = localStorage.getItem('uploadedProjects');
    const selectedTicket = localStorage.getItem('selectedTicket');
    
    console.log('=== LocalStorage Debug ===');
    console.log('Current Project:', currentProject ? JSON.parse(currentProject) : 'None');
    console.log('Uploaded Projects:', uploadedProjects ? JSON.parse(uploadedProjects) : 'None');
    console.log('Selected Ticket:', selectedTicket ? JSON.parse(selectedTicket) : 'None');
    
    alert(`LocalStorage Debug:
Current Project: ${currentProject ? 'Found' : 'None'}
Uploaded Projects: ${uploadedProjects ? JSON.parse(uploadedProjects).length + ' projects' : 'None'}
Selected Ticket: ${selectedTicket ? 'Found' : 'None'}`);
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('currentProject');
    localStorage.removeItem('uploadedProjects');
    localStorage.removeItem('selectedTicket');
    alert('LocalStorage cleared!');
  };

  const testNavigation = () => {
    console.log('Testing navigation...');
    window.location.hash = '#/diagnosis';
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: 'white',
        border: '2px solid #007bff',
        borderRadius: '10px',
        padding: '15px',
        minWidth: '200px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        Debug Panel
        <button
          onClick={() => setIsVisible(false)}
          style={{
            float: 'right',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={checkLocalStorage}
          style={{
            padding: '8px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Check LocalStorage
        </button>
        
        <button
          onClick={clearLocalStorage}
          style={{
            padding: '8px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear LocalStorage
        </button>
        
        <button
          onClick={testNavigation}
          style={{
            padding: '8px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Test Navigation
        </button>
        
        <button
          onClick={() => window.location.hash = '#/tickets'}
          style={{
            padding: '8px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go to Tickets
        </button>
      </div>
    </div>
  );
};