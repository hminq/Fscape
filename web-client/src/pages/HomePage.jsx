import AppNavbar from "../components/layout/AppNavbar";
import HeroSection from "../components/home/HeroSection";
import DiscoverSection from "../components/home/DiscoverSection";
import LocationsSection from "../components/home/LocationsSection";
import WhyChooseSection from "../components/home/WhyChooseSection";
import Footer from "../components/layout/Footer";
import { LocationsProvider } from "../contexts/LocationsContext";

export default function HomePage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen">
        <AppNavbar />
        <HeroSection />
        <div className="relative z-10 bg-white">
          <DiscoverSection />
          <div className="mx-auto max-w-5xl px-6 md:px-12">
            <div className="border-t border-muted/15" />
          </div>
          <LocationsSection />
        </div>
        <WhyChooseSection />
        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    </LocationsProvider>
  );
}
