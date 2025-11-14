import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { BentoGrid } from "@/components/BentoGrid";
import { WorldMapSection } from "@/components/WorldMapSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <BentoGrid />
        <WorldMapSection />
      </main>
      <Footer />
    </div>
  );
}
