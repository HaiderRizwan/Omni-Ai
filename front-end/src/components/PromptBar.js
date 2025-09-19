import { useState } from 'react';
import { motion } from 'framer-motion';

function PromptBar() {
  const [prompt, setPrompt] = useState('A cinematic portrait of a fox in neon lights');

  return (
    <section className="promptbar" id="generate">
      <div className="promptbar-container">
        <motion.input
          className="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          whileFocus={{ boxShadow: '0 0 0 2px rgba(139,147,255,0.25)' }}
        />
        <div className="prompt-actions">
          <motion.button className="btn btn-secondary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Random</motion.button>
          <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Generate</motion.button>
        </div>
      </div>
      <div className="promptbar-options">
        <select className="select">
          <option>Model: Vision v1</option>
          <option>Model: Vision v2</option>
        </select>
        <select className="select">
          <option>Aspect: 1:1</option>
          <option>Aspect: 3:2</option>
          <option>Aspect: 16:9</option>
        </select>
        <select className="select">
          <option>Guidance: 7</option>
          <option>Guidance: 10</option>
        </select>
      </div>
    </section>
  );
}

export default PromptBar;


