import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Wand2 } from 'lucide-react';
import { useSiteContent } from '../hooks/useData';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { content, loading } = useSiteContent();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading || !content) return null;

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Contents', href: '#performances' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Contact', href: '#contact' },
    { name: 'Network', href: '#network' },
  ];

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/login');

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      isScrolled ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-2xl tracking-tighter">
          {content.home.logo && !logoError ? (
            <img 
              src={content.home.logo} 
              alt="WHITRICKS Logo" 
              className="w-12 h-12 md:w-24 md:h-24 object-contain" 
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Wand2 className="text-purple-500" />
          )}
        </Link>

        {!isAdminPage && (
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs font-medium text-white/70 hover:text-white transition-colors uppercase tracking-widest"
              >
                {link.name}
              </a>
            ))}
            <Link
              to="/admin"
              className="text-[10px] font-bold text-purple-400 border border-purple-400/30 px-3 py-1 rounded-full hover:bg-purple-400/10 transition-all"
            >
              ADMIN
            </Link>
          </div>
        )}

        {!isAdminPage && (
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-black border-b border-white/10 p-6 flex flex-col gap-4 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-base font-medium text-white/70 hover:text-white transition-colors"
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
