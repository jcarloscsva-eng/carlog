import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthGate } from './components/AuthGate'
import { VehiculosPage } from './pages/VehiculosPage'
import { VehiculoDetailPage } from './pages/VehiculoDetailPage'
import { ReportesPage } from './pages/ReportesPage'
import { UsuariosPage } from './pages/UsuariosPage'

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<VehiculosPage />} />
            <Route path="/vehiculos/:id" element={<VehiculoDetailPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  )
}
