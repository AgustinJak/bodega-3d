import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { api } from './lib/api'
import { setCurrencySymbol } from './lib/format'
import './index.css'

// cargar símbolo de moneda configurado antes de pintar precios
api.getSettings().then((m) => setCurrencySymbol(m.currency_symbol)).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
