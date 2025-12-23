import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
    MessageSquare, Image as ImageIcon, Video, User,
    Sparkles, ArrowRight, Zap, Globe, Cpu, Palette,
    Play, Command, ChevronRight, Wand2
} from 'lucide-react';
import HeroGraphic from './HeroGraphic';

// --- Components ---

const BentoCard = ({ title, desc, icon: Icon, color, onClick, delay, className, bgImage }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        onClick={onClick}
        className={`relative group overflow-hidden rounded-2xl md:rounded-3xl cursor-pointer bg-neutral-900 border border-white/5 hover:border-white/20 transition-all duration-500 ${className}`}
    >
        {/* Background Image/Gradient */}
        {bgImage ? (
            <>
                <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </>
        ) : (
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${color}`} />
        )}

        {/* Content */}
        <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
                {!bgImage && (
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors`}>
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                )}
                {bgImage && <div />} {/* Spacer if needed, or just let arrow align right */}
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -rotate-45 group-hover:rotate-0 transform duration-300">
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
            </div>

            <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 tracking-tight">{title}</h3>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-[90%] group-hover:text-gray-200 transition-colors">{desc}</p>
            </div>
        </div>
    </motion.div>
);

const InfiniteMarquee = ({ images }) => {
    return (
        <div className="relative flex overflow-hidden w-full group">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

            <motion.div
                className="flex gap-4 py-8"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 30, // Adjust speed
                }}
                style={{ width: "max-content" }}
            >
                {[...images, ...images].map((img, i) => (
                    <div key={i} className="relative w-64 h-64 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 grayscale hover:grayscale-0 transition-all duration-500 hover:scale-105 cursor-pointer">
                        <img src={img} alt="Showcase" className="w-full h-full object-cover" />
                    </div>
                ))}
            </motion.div>
        </div>
    );
};


const Overview = ({ user, onToolSelect }) => {
    const [images, setImages] = useState([]);

    // Custom scroll parallax
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ container: containerRef });
    const yBackend = useTransform(scrollYProgress, [0, 1], [0, -50]);

    // Fetch explore images logic
    useEffect(() => {
        const fetchImages = async () => {
            try {
                const apiBase = process.env.REACT_APP_API_URL || "http://localhost:3001";
                const res = await fetch(`${apiBase}/api/images/explore`);
                if (res.ok) {
                    const json = await res.json();
                    if (json?.success && Array.isArray(json.data)) {
                        setImages(json.data.map(img => `${apiBase}/api/images/public/${img._id}`).slice(0, 20)); // Fetch more for cards + marquee
                    }
                }
            } catch (e) {
                console.error("Failed to fetch showcase images", e);
            }
        };
        fetchImages();
    }, []);

    return (
        <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar bg-black text-white">

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[40vh] md:min-h-[60vh] flex flex-col items-center justify-center text-center px-4 md:px-6 overflow-hidden py-10 md:py-0">

                {/* Animated Background Gradients */}
                {/* Animated Background Gradients & SVG */}
                <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
                    <HeroGraphic className="w-full h-full scale-150 transform opacity-50" />
                </div>

                {/* Secondary ambient glow */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[50vw] md:w-[70vw] h-[50vw] md:h-[70vw] bg-[var(--primary)] opacity-[0.05] blur-[100px] md:blur-[150px] rounded-full pointer-events-none"
                />

                <div className="relative z-10 max-w-4xl mx-auto space-y-4 md:space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold uppercase tracking-widest text-[var(--primary)] backdrop-blur-md"
                    >
                        <Sparkles className="w-3 h-3" />
                        <span>The Creation Engine</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-none"
                    >
                        DESIGN <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-neutral-500 to-neutral-200 animate-gradient-x">THE FUTURE</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 max-w-2xl mx-auto"
                    >
                        Welcome, {user?.firstName}. Your imagination is the only limit.
                    </motion.p>
                </div>
            </section>


            {/* --- BENTO GRID TOOLS --- */}
            <section className="px-4 md:px-6 lg:px-12 pb-16 md:pb-20 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 md:gap-4 h-auto md:h-[600px]">

                    {/* Main Feature: Chat (Large) */}
                    <BentoCard
                        className="col-span-2 min-h-[200px] md:min-h-0 md:row-span-2 bg-[var(--primary)]/5"
                        title="AI Companion"
                        desc="More than just chat. Code, write, and analyze with our most advanced model yet."
                        icon={MessageSquare}
                        color="from-[var(--primary)] to-transparent"
                        onClick={() => onToolSelect && onToolSelect('chat')}
                        delay={0.1}
                        // Use first image if available, else null
                        bgImage={images[0]}
                    />

                    {/* Image Gen (Tall) */}
                    <BentoCard
                        className="md:col-span-1 md:row-span-2"
                        title="Imagine"
                        desc="Text to Image generation."
                        icon={ImageIcon}
                        color="from-blue-500 to-purple-600"
                        onClick={() => onToolSelect && onToolSelect('image')}
                        delay={0.2}
                        bgImage={images[1]}
                    />

                    {/* Video (Wide top) */}
                    <BentoCard
                        className="md:col-span-1"
                        title="Motion"
                        desc="Cinematic video gen."
                        icon={Video}
                        color="from-purple-500 to-pink-500"
                        onClick={() => onToolSelect && onToolSelect('video')}
                        delay={0.3}
                        bgImage={images[2]}
                    />

                    {/* Avatar (Wide bottom) */}
                    <BentoCard
                        className="md:col-span-1"
                        title="Persona"
                        desc="Digital avatars."
                        icon={User}
                        color="from-green-500 to-emerald-500"
                        onClick={() => onToolSelect && onToolSelect('avatar')}
                        delay={0.4}
                        bgImage={images[3]}
                    />
                </div>
            </section>


            {/* --- INSPIRATION STREAM --- */}
            <section className="py-20 border-t border-white/5 bg-neutral-950/50">
                <div className="px-6 md:px-12 mb-10 flex items-end justify-between max-w-[1600px] mx-auto">
                    <div>
                        <h2 className="text-4xl font-bold mb-2">Made with Omni</h2>
                        <p className="text-gray-400">Live stream from the community.</p>
                    </div>
                    <button
                        onClick={() => onToolSelect && onToolSelect('explore')}
                        className="flex items-center gap-2 text-sm font-medium hover:text-[var(--primary)] transition-colors"
                    >
                        View Gallery <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {images.length > 0 ? (
                    <InfiniteMarquee images={images} />
                ) : (
                    <div className="h-64 flex items-center justify-center text-gray-800">
                        <p>Loading inspiration...</p>
                    </div>
                )}
            </section>

            {/* --- FOOTER CTA --- */}
            <section className="py-24 flex justify-center">
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                        <Wand2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold">Start your masterpiece.</h2>
                    <button
                        onClick={() => onToolSelect && onToolSelect('chat')}
                        className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        Create New Project
                    </button>
                </div>
            </section>

        </div>
    );
};

export default Overview;
