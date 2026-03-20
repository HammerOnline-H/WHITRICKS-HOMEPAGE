import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Youtube, Instagram, Twitter } from 'lucide-react';
import { SiteContent } from '../types';

export default function Contact({ data }: { data: SiteContent['contact'] }) {
  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram size={18} />;
      case 'twitter': return <Twitter size={18} />;
      default: return null;
    }
  };

  return (
    <section id="contact" className="py-32 bg-zinc-950 text-white px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-xs font-bold text-purple-500 uppercase tracking-[0.5em] mb-16 text-center"
        >
          Contact & Connection
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-24">
          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold tracking-tight">Let's Connect.</h3>
              <p className="text-white/40 max-w-md leading-relaxed">
                Reach out for bookings, collaborations, or just to say hello. We're always open to new magical opportunities.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-purple-500">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Address</p>
                  <p className="text-lg">{data.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-purple-500">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Phone</p>
                  <p className="text-lg">{data.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-purple-500">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-lg">{data.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="bg-zinc-900 p-12 rounded-3xl border border-white/5 space-y-8">
              <h4 className="text-xl font-bold">Social Channels</h4>
              <div className="grid gap-4">
                <a href={data.youtube} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-red-500/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <Youtube className="text-red-500" />
                    <span className="text-sm font-bold uppercase tracking-widest">YouTube</span>
                  </div>
                  <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">VISIT CHANNEL</span>
                </a>
                {data.sns.map((item, idx) => (
                  <a key={idx} href={item.url} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-purple-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                      {getIcon(item.platform)}
                      <span className="text-sm font-bold uppercase tracking-widest">{item.platform}</span>
                    </div>
                    <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">FOLLOW</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
