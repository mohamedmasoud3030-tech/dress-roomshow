import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('عنصر تشغيل التطبيق root غير موجود في الصفحة.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
