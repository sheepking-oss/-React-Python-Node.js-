import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { AppProvider } from './contexts/AppContext';
import { SearchProvider } from './contexts/SearchContext';
import { FavoriteProvider } from './contexts/FavoriteContext';
import { ComparisonProvider } from './contexts/ComparisonContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <SearchProvider>
          <FavoriteProvider>
            <ComparisonProvider>
              <App />
            </ComparisonProvider>
          </FavoriteProvider>
        </SearchProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
