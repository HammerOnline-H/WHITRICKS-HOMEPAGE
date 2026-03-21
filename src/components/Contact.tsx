import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Youtube, Instagram, ExternalLink } from 'lucide-react';
import { SiteContent } from '../types';

export default function Contact({ data }: { data: SiteContent['contact'] }) {
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
              <h3 className="text-4xl font-bold tracking-tight">{data.title || "Let's Connect."}</h3>
              <p className="text-white/40 max-w-md leading-relaxed">
                {data.description || "Reach out for bookings, collaborations, or just to say hello. We're always open to new magical opportunities."}
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
                {data.youtube && (
                  <a href={data.youtube} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-red-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <Youtube className="text-red-500" />
                      <span className="text-sm font-bold uppercase tracking-widest">YouTube</span>
                    </div>
                    <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">VISIT CHANNEL</span>
                  </a>
                )}
                {data.instagram && (
                  <a href={data.instagram} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-pink-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <Instagram className="text-pink-500" />
                      <span className="text-sm font-bold uppercase tracking-widest">Instagram</span>
                    </div>
                    <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">FOLLOW</span>
                  </a>
                )}
                {data.naverBlog && (
                  <a href={data.naverBlog} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-emerald-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <ExternalLink className="text-emerald-500" />
                      <span className="text-sm font-bold uppercase tracking-widest">Naver Blog</span>
                    </div>
                    <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">READ BLOG</span>
                  </a>
                )}
                {data.naverPlace && (
                  <a href={data.naverPlace} target="_blank" className="flex items-center justify-between p-4 bg-black rounded-xl border border-white/5 hover:border-blue-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <ExternalLink className="text-blue-500" />
                      <span className="text-sm font-bold uppercase tracking-widest">Naver Place</span>
                    </div>
                    <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">VIEW PLACE</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
