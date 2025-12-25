import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders production issue diagnosis platform', () => {
  render(<App />);
  const headerElement = screen.getByRole('banner');
  expect(headerElement).toBeInTheDocument();
  
  const titleElements = screen.getAllByText(/生产问题诊断平台/i);
  expect(titleElements.length).toBeGreaterThan(0);
});

test('renders home page by default', () => {
  render(<App />);
  const heroElement = screen.getByText(/结合AI智能分析，快速定位和诊断生产环境问题/i);
  expect(heroElement).toBeInTheDocument();
});
