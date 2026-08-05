import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DevEmailGate } from './components/DevEmailGate'
import { VehiculosPage } from './pages/VehiculosPage'
import { VehiculoDetailPage } from './pages/VehiculoDetailPage'
import { ReportesPage } from './pages/ReportesPage'

export default function App() {
  return (
    <DevEmailGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<VehiculosPage />} />
            <Route path="/vehiculos/:id" element={<VehiculoDetailPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DevEmailGate>
  )
}
