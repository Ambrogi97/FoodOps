import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Problemas from './components/Problemas'
import ComoFunciona from './components/ComoFunciona'
import Caracteristicas from './components/Caracteristicas'
import Planes from './components/Planes'
import Footer from './components/Footer'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Carta from './pages/Carta'
import Tracking from './pages/Tracking'
import Resena from './pages/Resena'
import ResetPassword from './pages/ResetPassword'

function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problemas />
        <ComoFunciona />
        <Caracteristicas />
        <Planes />
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
        <Route path="/tracking/:pedidoId" element={<Tracking />} />
        <Route path="/resena/:pedidoId" element={<Resena />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
