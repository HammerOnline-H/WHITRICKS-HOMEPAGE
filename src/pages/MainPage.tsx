import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Performances from '../components/Performances';
import Gallery from '../components/Gallery';
import Contact from '../components/Contact';
import Network from '../components/Network';
import { useSiteContent, usePerformances, useGallery, usePartners, useMembers } from '../hooks/useData';

export default function MainPage() {
  const { content, loading: contentLoading } = useSiteContent();
  const { performances, loading: perfLoading } = usePerformances();
  const { gallery, loading: galleryLoading } = useGallery();
  const { partners, loading: partnersLoading } = usePartners();
  const { members, loading: membersLoading } = useMembers();

  if (contentLoading || perfLoading || galleryLoading || partnersLoading || membersLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen scroll-smooth">
      <Navbar />
      <Hero data={content.home} />
      <About history={content.about.history} members={members} />
      <Performances data={performances} />
      <Gallery data={gallery} />
      <Contact data={content.contact} />
      <Network data={partners} />
      
      <footer className="py-12 bg-black border-t border-white/5 text-center text-white/30 text-[10px] uppercase tracking-[0.3em]">
        <p>© 2026 WHITRICKS MAGIC TEAM. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
