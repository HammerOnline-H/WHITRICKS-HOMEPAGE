import { motion } from 'motion/react';
import { Performance } from '../types';

export default function Performances({ data }: { data: Performance[] }) {
  return (
    <section id="performances" className="py-32 bg-zinc-950 text-white px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em] mb-16 text-center"
        >
          Our Performances
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {data.map((perf, idx) => (
            <motion.div
              key={perf.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 bg-zinc-900 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all group"
            >
              <h3 className="text-2xl font-bold mb-6 group-hover:text-purple-400 transition-colors">{perf.category}</h3>
              <div className="space-y-3 text-white/50 text-sm leading-relaxed whitespace-pre-wrap">
                {perf.repertoires}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
