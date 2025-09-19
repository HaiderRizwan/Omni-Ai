import { motion } from 'framer-motion';

function Footer() {
  return (
    <footer className="footer">
      <motion.div className="footer-container" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <div className="footer-left">
          <div className="brand">Omni Ai</div>
          <p>© {new Date().getFullYear()} Omni ai. All rights reserved.</p>
        </div>
        <ul className="footer-links">
          <li><a href="#">Docs</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Community</a></li>
          <li><a href="#">Support</a></li>
        </ul>
      </motion.div>
    </footer>
  );
}

export default Footer;


