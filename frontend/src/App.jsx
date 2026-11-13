import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import SocialProof from './components/SocialProof'
import Problemas from './components/Problemas'
import ComoFunciona from './components/ComoFunciona'
import Caracteristicas from './components/Caracteristicas'
import Planes from './components/Planes'
import FAQ from './components/FAQ'
import CTAFinal from './components/CTAFinal'
import Footer from './components/Footer'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Carta from './pages/Carta'
import Tracking from './pages/Tracking'
import Resena from './pages/Resena'
import ResetPassword from './pages/ResetPassword'
import VerificarEmail from './pages/VerificarEmail'

function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Problemas />
        <ComoFunciona />
        <Caracteristicas />
        <Planes />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/carta/:userId" element={<Carta />} />
        <Route path="/carta" element={<Navigate to="/" replace />} />
        <Route path="/carta/" element={<Navigate to="/" replace />} />
        <Route path="/tracking/:pedidoId" element={<Tracking />} />
        <Route path="/resena/:pedidoId" element={<Resena />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
