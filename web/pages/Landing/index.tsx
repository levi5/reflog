import { Features } from "../../components/Features"
import { Footer } from "../../components/Footer"
import { Header } from "../../components/Header"
import { Hero } from "../../components/Hero"
import { Install } from "../../components/Install"
import { Showcase } from "../../components/Showcase"

import "./styles.css"

export const Landing = () => (
  <div className="landing">
    <Header />
    <main className="landing__main">
      <Hero />
      <Features />
      <Showcase />
      <Install />
    </main>
    <Footer />
  </div>
)
