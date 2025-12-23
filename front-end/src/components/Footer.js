import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin } from 'lucide-react';

function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-12 md:pt-20 pb-8 md:pb-10 px-4 md:px-6">
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Footer Grid - Stack on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
          {/* Brand Section - Full width on mobile */}
          <div className="col-span-2">
            <div className="font-heading text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Omni<span className="text-[var(--primary)]">.ai</span></div>
            <p className="text-sm md:text-base text-white/50 max-w-sm">
              Empowering creators with the next generation of AI tools.
              Unleash your potential with precision-engineered prompts and avatars.
            </p>
            <div className="flex gap-3 md:gap-4 mt-5 md:mt-6">
              {['Twitter', 'Github', 'Linkedin'].map(social => (
                <a key={social} href="#" className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors touch-target">
                  {social === 'Twitter' && <Twitter size={18} />}
                  {social === 'Github' && <Github size={18} />}
                  {social === 'Linkedin' && <Linkedin size={18} />}
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold text-white mb-4 md:mb-6 text-sm md:text-base">Product</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-white/60">
              <li><button onClick={() => onNavigate('features')} className="hover:text-[var(--primary)] transition-colors text-left touch-target">Features</button></li>
              <li><button onClick={() => onNavigate('pricing')} className="hover:text-[var(--primary)] transition-colors text-left touch-target">Pricing</button></li>
              <li><button disabled className="hover:text-[var(--primary)] transition-colors text-left opacity-50 cursor-not-allowed">API (Beta)</button></li>
              <li><button disabled className="hover:text-[var(--primary)] transition-colors text-left opacity-50 cursor-not-allowed">Showcase</button></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-bold text-white mb-4 md:mb-6 text-sm md:text-base">Company</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-white/60">
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Careers</a></li>
              <li><button onClick={() => onNavigate('support')} className="hover:text-[var(--primary)] transition-colors text-left touch-target">Contact</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar - Stack on mobile */}
        <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-white/40">
          <p className="text-center md:text-left">© {new Date().getFullYear()} Omni ai Inc. All rights reserved.</p>
          <div className="flex gap-6 md:gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}

export default Footer;
