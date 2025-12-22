import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin } from 'lucide-react';

function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-20 pb-10">
      <motion.div
        className="max-w-7xl mx-auto px-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="font-heading text-2xl font-bold text-white mb-4">Omni<span className="text-[var(--primary)]">.ai</span></div>
            <p className="text-white/50 max-w-sm">
              Empowering creators with the next generation of AI tools.
              Unleash your potential with precision-engineered prompts and avatars.
            </p>
            <div className="flex gap-4 mt-6">
              {['Twitter', 'Github', 'Linkedin'].map(social => (
                <a key={social} href="#" className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  {social === 'Twitter' && <Twitter size={20} />}
                  {social === 'Github' && <Github size={20} />}
                  {social === 'Linkedin' && <Linkedin size={20} />}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li><button onClick={() => onNavigate('features')} className="hover:text-[var(--primary)] transition-colors text-left">Features</button></li>
              <li><button onClick={() => onNavigate('pricing')} className="hover:text-[var(--primary)] transition-colors text-left">Pricing</button></li>
              <li><button disabled className="hover:text-[var(--primary)] transition-colors text-left opacity-50 cursor-not-allowed">API (Beta)</button></li>
              <li><button disabled className="hover:text-[var(--primary)] transition-colors text-left opacity-50 cursor-not-allowed">Showcase</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Careers</a></li>
              <li><button onClick={() => onNavigate('support')} className="hover:text-[var(--primary)] transition-colors text-left">Contact</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Omni ai Inc. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}

export default Footer;


