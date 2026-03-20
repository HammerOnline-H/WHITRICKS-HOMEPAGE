import { motion } from 'motion/react';

export default function Hero({ data }: { data: { title: string, slogan: string, bgImage: string, logo?: string } }) {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={data.bgImage}
          alt="Hero Background"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
      </div>

      <div className="relative z-10 text-left px-6 max-w-7xl w-full flex flex-col items-start">
        <motion.h1
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-9xl font-bold text-white mb-8 tracking-tighter uppercase whitespace-pre-line leading-[0.9]"
        >
          {data.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-2xl text-white/80 font-light tracking-[0.3em] uppercase whitespace-pre-line"
        >
          {data.slogan}
        </motion.p>
      </div>
    </section>
  );
}
