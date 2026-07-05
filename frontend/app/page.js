import DemoProvider from '@/components/DemoProvider';
import Topbar from '@/components/Topbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import LiveDemo from '@/components/LiveDemo';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <DemoProvider>
      <Topbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <LiveDemo />
      </main>
      <Footer />
    </DemoProvider>
  );
}
