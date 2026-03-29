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
          CONTENTS
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {data.map((perf, idx) => (
            <motion.div
              key={perf.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/5 mb-6">
                <img 
                  src={perf.image} 
                  alt={perf.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 group-hover:text-purple-400 transition-colors">{perf.title}</h3>
              <div className="text-white/50 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                {perf.description}
              </div>

              {perf.images && perf.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {perf.images.slice(1).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/5">
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
