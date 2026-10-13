import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { prepare } from './bridge';
import '../../shared/av-console/console.css';
import './styles.css';

function start() {
  // Shared context hydration schedules a task at DOMContentLoaded first.
  setTimeout(() => {
    prepare();
    if (window.parent !== window && new URLSearchParams(location.search).get('sbdEmbed') === 'console') document.documentElement.classList.add('calculator-embedded');
    createRoot(document.getElementById('calculatorRoot')!).render(<React.StrictMode><App /></React.StrictMode>);
    document.documentElement.dataset.calculatorViewport = 'ready';
  }, 0);
}
if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
