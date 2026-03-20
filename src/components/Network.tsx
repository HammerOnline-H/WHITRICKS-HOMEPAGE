import { motion } from 'motion/react';
import { Partner } from '../types';

export default function Network({ data }: { data: Partner[] }) {
  return (
    <section id="network" className="py-32 bg-black text-white px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em] mb-16 text-center"
        >
          Our Network
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
          {data.map((partner, idx) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="group flex flex-col items-center text-center space-y-4"
            >
              <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center p-4 grayscale group-hover:grayscale-0 group-hover:border-purple-500/50 transition-all duration-500">
                <img src={partner.logo} alt={partner.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest">{partner.name}</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-tighter">{partner.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
