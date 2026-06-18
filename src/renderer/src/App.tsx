import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Modelos from './pages/Modelos'
import ModeloDetalle from './pages/ModeloDetalle'
import ModeloForm from './pages/ModeloForm'
import Calculadora from './pages/Calculadora'
import Configuracion from './pages/Configuracion'
import Impresoras from './pages/Impresoras'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/modelos" element={<Modelos />} />
        <Route path="/modelos/nuevo" element={<ModeloForm />} />
        <Route path="/modelos/:id" element={<ModeloDetalle />} />
        <Route path="/modelos/:id/editar" element={<ModeloForm />} />
        <Route path="/calculadora" element={<Calculadora />} />
        <Route path="/impresoras" element={<Impresoras />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
