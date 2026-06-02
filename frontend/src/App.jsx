import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Problemas from './components/Problemas'
import ComoFunciona from './components/ComoFunciona'
import Caracteristicas from './components/Caracteristicas'
import Planes from './components/Planes'
import Footer from './components/Footer'

function App() {
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

export default App
