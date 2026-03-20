import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Member } from '../types';
import { ExternalLink, Play, X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export default function About({ history, members }: { history: string, members: Member[] }) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const isCarousel = members.length >= 4;

  return (
    <section id="about" className="py-32 bg-black text-white px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* History Section */}
        <div className="mb-40">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em] mb-12"
          >
            Team History
          </motion.h2>
          
          <div className="relative group cursor-pointer" onClick={() => setShowHistory(true)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-6xl font-bold text-white leading-[1.1] tracking-tighter max-w-5xl line-clamp-3 group-hover:text-purple-400 transition-colors whitespace-pre-wrap"
            >
              {history}
            </motion.div>
            <div className="mt-8 flex items-center gap-4 text-purple-500 font-bold uppercase tracking-widest text-xs">
              <span>Read Full History</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="relative">
          <div className="flex items-center justify-between mb-12">
            <motion.h2 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em]"
            >
              Team Members
            </motion.h2>
            
            {isCarousel && (
              <div className="flex gap-2">
                <button 
                  onClick={() => scrollCarousel('left')}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => scrollCarousel('right')}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {isCarousel ? (
            <div 
              ref={carouselRef}
              className="flex gap-12 overflow-x-auto pb-12 snap-x no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {members.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex-shrink-0 w-[180px] md:w-[225px] snap-start group cursor-pointer flex flex-col items-center"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="relative w-full aspect-square overflow-hidden rounded-full border border-white/10 mb-6">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white text-center line-clamp-1">{member.name}</h3>
                  <p className="text-purple-500 font-bold uppercase tracking-widest text-[10px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Profile</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-12">
              {members.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer flex flex-col items-center w-[180px] md:w-[225px]"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="relative w-full aspect-square overflow-hidden rounded-full border border-white/10 mb-6">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white text-center line-clamp-1">{member.name}</h3>
                  <p className="text-purple-500 font-bold uppercase tracking-widest text-[10px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Profile</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setShowHistory(false)}
          >
            <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="max-w-4xl w-full bg-zinc-900/50 p-12 md:p-20 rounded-[40px] border border-white/10 max-h-[80vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em] mb-12">Performance History</h2>
              <div className="text-2xl md:text-4xl font-light text-white/90 leading-relaxed whitespace-pre-wrap">
                {history}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setSelectedMember(null)}
          >
            <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="max-w-6xl w-full bg-zinc-900/50 rounded-[40px] border border-white/10 overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
                <img src={selectedMember.image} alt={selectedMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 p-10 md:p-20 overflow-y-auto custom-scrollbar space-y-10">
                <div className="space-y-4">
                  <h3 className="text-5xl md:text-7xl font-bold tracking-tighter">{selectedMember.name}</h3>
                  <div className="h-1 w-20 bg-purple-500" />
                </div>
                
                <div className="text-lg md:text-xl text-white/70 leading-relaxed whitespace-pre-wrap">
                  {selectedMember.bio}
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Links & Media</h4>
                  <div className="flex flex-wrap gap-4">
                    {selectedMember.links.map((link, idx) => (
                      <a key={idx} href="#" className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-white transition-colors uppercase tracking-widest border border-purple-400/20 px-4 py-2 rounded-full">
                        <ExternalLink size={14} />
                        {link}
                      </a>
                    ))}
                    {selectedMember.videoUrl && (
                      <a href={selectedMember.videoUrl} target="_blank" className="flex items-center gap-2 text-xs font-bold text-white bg-purple-600 px-6 py-2 rounded-full hover:bg-purple-500 transition-all uppercase tracking-widest">
                        <Play size={12} fill="currentColor" />
                        Watch Performance
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
