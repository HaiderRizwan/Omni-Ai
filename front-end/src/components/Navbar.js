import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, X, ArrowRight, User, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AuthModal from './AuthModal';
import HeroGraphic from './dashboard/HeroGraphic';

function classNames(...classes) {
	return classes.filter(Boolean).join(' ');
}

function Navbar({ currentView, onNavigate }) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [dark, setDark] = useState(true);
	const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark);
	}, [dark]);

	return (
		<nav className="sticky top-0 z-[100] border-b border-white/5 bg-noir-800/80 backdrop-blur-xl">
			<div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 h-16 md:h-20">
				<motion.button
					onClick={() => onNavigate('home')}
					className="flex items-center gap-2 md:gap-3 group bg-transparent border-0 cursor-pointer"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, ease: 'circOut' }}
				>
					<div className="relative h-8 w-8 md:h-10 md:w-10 overflow-hidden rounded-lg md:rounded-xl bg-white/5 border border-white/10 group-hover:border-[var(--primary)]/50 transition-colors shadow-lg shadow-[var(--primary)]/10">
						<div className="absolute inset-0 bg-black/40" />
						<HeroGraphic className="w-full h-full scale-110" />
					</div>
					<span className="font-heading text-lg md:text-xl font-bold tracking-widest text-white group-hover:text-[var(--primary)] transition-colors uppercase hidden sm:inline">OMNI AI</span>
				</motion.button>

				{/* Desktop Center Nav */}
				<div className="hidden md:flex items-center gap-1">
					{[
						{ name: 'Features', id: 'features' },
						{ name: 'Pricing', id: 'pricing' },
						{ name: 'Support', id: 'support' },
					].map((item) => (
						<button
							key={item.id}
							onClick={() => onNavigate(item.id)}
							className={`
								relative px-5 py-2 text-sm font-medium transition-colors rounded-full hover:text-white
								${currentView === item.id ? 'text-white bg-white/5' : 'text-white/60'}
							`}
						>
							{item.name}
							{currentView === item.id && (
								<motion.div
									layoutId="navbar-indicator"
									className="absolute inset-0 rounded-full border border-white/10"
									transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
								/>
							)}
						</button>
					))}
				</div>

				{/* Right side: theme, auth */}
				<div className="hidden items-center gap-4 md:flex">
					<button aria-label="Toggle theme" onClick={() => setDark((d) => !d)} className="ui-icon-btn hidden">
						{dark ? <Moon size={20} /> : <Sun size={20} />}
					</button>
					<button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="text-sm font-semibold text-white/90 hover:text-[var(--primary)] transition-colors px-4 py-2">Log in</button>
					<button onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })} className="ui-btn-primary text-sm shadow-md hover:shadow-lg">Get Started</button>
				</div>

				{/* Mobile hamburger */}
				<button aria-label="Open menu" className="md:hidden p-2 text-white/70 hover:text-white transition-colors touch-target" onClick={() => setMobileOpen(true)}>
					<Menu size={22} />
				</button>
			</div>

			{/* Mobile drawer */}
			<AnimatePresence>
				{mobileOpen && (
					<>
						<motion.div
							className="fixed inset-0 z-[150]"
							style={{ backgroundColor: '#000000' }}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileOpen(false)}
						/>
						<motion.aside
							className="fixed inset-0 z-[160] min-h-screen w-full sm:w-[85%] sm:max-w-sm sm:left-auto p-6 shadow-2xl overflow-y-auto"
							style={{ backgroundColor: '#0A0A0A' }}
							initial={{ x: '100%' }}
							animate={{ x: 0 }}
							exit={{ x: '100%' }}
							transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						>
							<div className="mb-8 flex items-center justify-between">
								<div className="font-heading text-xl font-bold text-white">Omni<span className="text-[var(--primary)]">.ai</span></div>
								<button aria-label="Close menu" className="p-2 text-white/60 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>Close</button>
							</div>

							<div className="space-y-1">
								<button onClick={() => { onNavigate('home'); setMobileOpen(false); }} className="w-full text-left rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/5 hover:text-[var(--primary)] transition-colors">Home</button>
								<button onClick={() => { onNavigate('features'); setMobileOpen(false); }} className="w-full text-left rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/5 hover:text-[var(--primary)] transition-colors">Features</button>
								<button onClick={() => { onNavigate('pricing'); setMobileOpen(false); }} className="w-full text-left rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/5 hover:text-[var(--primary)] transition-colors">Pricing</button>
								<button onClick={() => { onNavigate('support'); setMobileOpen(false); }} className="w-full text-left rounded-lg px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/5 hover:text-[var(--primary)] transition-colors">Support</button>

								<div className="mt-8 grid gap-4">
									<button onClick={() => { setAuthModal({ isOpen: true, mode: 'login' }); setMobileOpen(false); }} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-white hover:bg-white/10 transition-colors">Log in</button>
									<button onClick={() => { setAuthModal({ isOpen: true, mode: 'signup' }); setMobileOpen(false); }} className="w-full rounded-xl bg-[var(--primary)] py-3 font-bold text-black hover:bg-[var(--primary-700)] transition-colors shadow-lg shadow-[var(--primary)]/20">Get Started</button>
								</div>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

			{/* Auth Modal */}
			<AuthModal
				isOpen={authModal.isOpen}
				onClose={() => setAuthModal({ isOpen: false, mode: 'login' })}
				mode={authModal.mode}
			/>
		</nav>
	);
}

export default Navbar;
