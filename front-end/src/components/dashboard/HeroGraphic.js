import React from 'react';
import { motion } from 'framer-motion';

const HeroGraphic = ({ className }) => {
    return (
        <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 800 800"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full opacity-80"
                style={{ filter: 'drop-shadow(0 0 40px rgba(var(--primary-rgb), 0.3))' }}
            >
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                    </linearGradient>
                    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* --- Background Glow --- */}
                <motion.circle
                    cx="400"
                    cy="400"
                    r="300"
                    fill="url(#glow)"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* --- Outer Orbital Ring (Slow Rotate) --- */}
                <motion.g
                    style={{ originX: "400px", originY: "400px" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                    <circle cx="400" cy="400" r="350" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
                    <path
                        d="M400 50 A350 350 0 0 1 750 400"
                        stroke="var(--primary)"
                        strokeOpacity="0.3"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <circle cx="400" cy="50" r="4" fill="var(--primary)" />
                    <circle cx="750" cy="400" r="4" fill="var(--primary)" />
                </motion.g>

                {/* --- Middle Orbital Mesh (Reverse Rotate) --- */}
                <motion.g
                    style={{ originX: "400px", originY: "400px" }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                    <circle cx="400" cy="400" r="280" stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="20 20" />
                    {/* Geometric Shapes */}
                    <motion.path
                        d="M400 150 L616 275 L616 525 L400 650 L184 525 L184 275 Z"
                        stroke="url(#grad1)"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        fill="none"
                    />
                </motion.g>

                {/* --- Inner Core Structure (Pulse & Spin) --- */}
                <motion.g
                    style={{ originX: "400px", originY: "400px" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                    {/* Abstract Omni Logo Shape */}
                    <path
                        d="M400 250 C482 250 550 317 550 400 C550 482 482 550 400 550 C317 550 250 482 250 400 C250 317 317 250 400 250 Z"
                        stroke="var(--primary)"
                        strokeWidth="4"
                        strokeOpacity="0.8"
                        fill="none"
                    />
                    {/* Intersecting Arcs */}
                    <path d="M400 250 C317 250 250 317 250 400" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
                    <path d="M550 400 C550 317 482 250 400 250" stroke="white" strokeOpacity="0.2" strokeWidth="2" />

                    <circle cx="400" cy="250" r="6" fill="white" />
                    <circle cx="550" cy="400" r="6" fill="white" />
                    <circle cx="400" cy="550" r="6" fill="white" />
                    <circle cx="250" cy="400" r="6" fill="white" />
                </motion.g>

                {/* --- Central Nucleus (Heartbeat) --- */}
                <motion.circle
                    cx="400"
                    cy="400"
                    r="40"
                    fill="var(--primary)"
                    animate={{ scale: [1, 1.2, 0.9, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle
                    cx="400"
                    cy="400"
                    r="60"
                    stroke="white"
                    strokeWidth="2"
                    opacity="0.5"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />

                {/* --- Floating Particles --- */}
                {[...Array(8)].map((_, i) => (
                    <motion.circle
                        key={i}
                        cx="400"
                        cy="400"
                        r={Math.random() * 3 + 2}
                        fill="white"
                        initial={{ x: 0, y: 0, opacity: 0 }}
                        animate={{
                            x: (Math.random() - 0.5) * 600,
                            y: (Math.random() - 0.5) * 600,
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: Math.random() * 4 + 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 2
                        }}
                    />
                ))}
            </svg>
        </div>
    );
};

export default HeroGraphic;
