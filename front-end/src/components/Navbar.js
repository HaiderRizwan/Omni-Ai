import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Sparkles, Printer, Camera, Home as HomeIcon, Building2, Menu as MenuIcon, ChevronDown, Moon, Sun, UserRound, Film, Image as ImageIcon, Send } from 'lucide-react';
import AuthModal from './AuthModal';

function classNames(...classes) {
	return classes.filter(Boolean).join(' ');
}

function useKeyPress(targetKeys, handler) {
	useEffect(() => {
		function onKey(e) {
			if (targetKeys.includes(e.key)) handler(e);
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [targetKeys, handler]);
}

function DropdownMenu({ title, items, open, onOpen, onClose, align = 'center' }) {
	const containerRef = useRef(null);
	const [focusedIndex, setFocusedIndex] = useState(-1);

	useKeyPress(['Escape'], (e) => {
		if (open) {
			e.preventDefault();
			onClose();
			setFocusedIndex(-1);
		}
	});

	const menuId = useMemo(() => `${title.toLowerCase().replace(/\s+/g, '-')}-menu`, [title]);

	return (
		<li
			className="relative"
			onMouseEnter={onOpen}
			onMouseLeave={() => {
				setFocusedIndex(-1);
				onClose();
			}}
			ref={containerRef}
		>
			<button
				type="button"
				className="group flex items-center gap-1 text-base md:text-lg text-white/85 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => (open ? onClose() : onOpen())}
				onKeyDown={(e) => {
					if ((e.key === 'Enter' || e.key === ' ') && !open) {
						e.preventDefault();
						onOpen();
						setFocusedIndex(0);
					}
					if (e.key === 'ArrowDown' && open) {
						e.preventDefault();
						setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
					}
					if (e.key === 'ArrowUp' && open) {
						e.preventDefault();
						setFocusedIndex((i) => Math.max(i - 1, 0));
					}
				}}
			>
				<span className="relative">
					{title}
					<span className="pointer-events-none absolute -bottom-0.5 left-0 h-[2px] w-0 bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 transition-all duration-200 group-hover:w-full" />
				</span>
				<ChevronDown size={18} className={classNames('transition-transform', open ? 'rotate-180' : '')} aria-hidden="true" />
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 6 }}
						transition={{ duration: 0.18 }}
						className={classNames(
							'absolute mt-3 w-[600px] max-w-[92vw] rounded-xl border border-white/10 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl',
							'bg-gradient-to-br from-[#0d0f1a]/90 via-[#0e1020]/80 to-[#0a0b14]/90',
							align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0'
						)}
						id={menuId}
						role="menu"
					>
						<div className="grid grid-cols-2 gap-2">
							{items.map(({ title: t, desc, Icon }, idx) => (
								<motion.a
									key={t}
									href="#"
									className={classNames(
										'group flex items-start gap-3 rounded-lg p-3 transition overflow-hidden',
										'hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-400/60'
									)}
									role="menuitem"
									onMouseEnter={() => setFocusedIndex(idx)}
									onFocus={() => setFocusedIndex(idx)}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.18, delay: idx * 0.03 }}
								>
									<div className="mt-0.5 rounded-md border border-white/10 bg-white/5 p-2 text-indigo-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.35)] group-hover:text-indigo-200">
										<Icon size={18} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="font-medium text-white group-hover:text-white break-words">{t}</div>
										<div className="mt-0.5 text-[12px] leading-snug text-white/70" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
											{desc}
										</div>
									</div>
								</motion.a>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</li>
	);
}

function Navbar() {
	const [openMenuKey, setOpenMenuKey] = useState(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [dark, setDark] = useState(true);
	const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark);
	}, [dark]);

	const items = [
		{ title: 'Avatar Creation', desc: 'Generate unique digital avatars with AI.', Icon: UserRound },
		{ title: 'AI Video with Avatars', desc: 'Create engaging AI-powered videos featuring avatars.', Icon: Film },
		{ title: 'AI Image Creation', desc: 'Turn text prompts into stunning AI-generated images.', Icon: ImageIcon },
		{ title: 'Automated Social Media Posting', desc: 'Auto-generate posts and publish across platforms.', Icon: Send },
	];

	const open = (key) => setOpenMenuKey(key);
	const close = () => setOpenMenuKey(null);

  return (
		<nav className="sticky top-0 z-50 border-b border-white/10 bg-white/5 text-white backdrop-blur-xl dark:bg-black/30">
			<div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
				<motion.a
					href="#"
					className="flex items-center gap-2"
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
				>
					<img src="/omnilogo.png" alt="Omni Ai" className="h-10 w-10 rounded-sm object-contain md:h-12 md:w-12" />
					<span className="text-2xl md:text-3xl bg-gradient-to-r from-red-500 via-rose-300 to-white bg-clip-text font-extrabold tracking-tight text-transparent drop-shadow-[0_0_16px_rgba(239,68,68,0.25)]">Omni ai</span>
              </motion.a>

				{/* Centered nav */}
				<ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-base md:text-lg md:flex">
					<li>
						<a href="#" className="text-white/85 transition-colors hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">
							<span className="relative">
								Home
								<span className="pointer-events-none absolute -bottom-0.5 left-0 h-[2px] w-0 bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 transition-all duration-200 group-hover:w-full" />
							</span>
						</a>
					</li>

					<DropdownMenu
						title="Features"
						items={items}
						open={openMenuKey === 'features'}
						onOpen={() => open('features')}
						onClose={close}
					/>

					<DropdownMenu
						title="Solutions"
						items={items}
						open={openMenuKey === 'solutions'}
						onOpen={() => open('solutions')}
						onClose={close}
					/>

					<li>
						<a href="#free-features" className="text-white/85 transition-colors hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">Free Features</a>
					</li>

					<li>
						<a href="#pricing" className="text-white/85 transition-colors hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">Pricing</a>
            </li>
        </ul>

				{/* Right side: theme, auth */}
				<div className="hidden items-center gap-4 md:flex">
					<button aria-label="Toggle theme" onClick={() => setDark((d) => !d)} className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-white/80 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
						{dark ? <Moon size={18} /> : <Sun size={18} />}
					</button>
					<button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="text-base text-white/85 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60">Login</button>
					<button onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })} className="text-base rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60">Sign Up</button>
				</div>

				{/* Mobile hamburger */}
				<button aria-label="Open menu" className="md:hidden rounded-md border border-white/15 p-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60" onClick={() => setMobileOpen(true)}>
					<MenuIcon size={18} />
        </button>
      </div>

			{/* Mobile drawer */}
			<AnimatePresence>
				{mobileOpen && (
					<>
						<motion.div className="fixed inset-0 z-[60] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
						<motion.aside className="fixed right-0 top-0 z-[70] h-full w-[88%] max-w-sm bg-[#0c0d13] p-4 text-white shadow-2xl ring-1 ring-black/5" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
							<div className="mb-4 flex items-center justify-between">
								<div className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 bg-clip-text font-semibold text-transparent">Omni Ai</div>
								<button aria-label="Close menu" className="rounded-md border border-white/15 px-2 py-1 text-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/60" onClick={() => setMobileOpen(false)}>Close</button>
							</div>

							<div className="space-y-2">
								<a href="#" className="block rounded-md px-3 py-2 text-white/85 transition hover:bg-white/5">Home</a>

								{/* Accordion: Features */}
								<details className="group rounded-md border border-white/10 bg-white/5 p-2">
									<summary className="flex cursor-pointer items-center justify-between px-1 py-1 text-white/85">
										<span>Features</span>
										<ChevronDown size={16} className="transition group-open:rotate-180" />
									</summary>
									<div className="mt-2 grid grid-cols-1 gap-1">
										{items.map(({ title, Icon }) => (
											<a key={title} href="#" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white/80 transition hover:bg-white/5">
												<Icon size={16} className="text-indigo-300" />
												{title}
											</a>
										))}
									</div>
								</details>

								{/* Accordion: Solutions */}
								<details className="group rounded-md border border-white/10 bg-white/5 p-2">
									<summary className="flex cursor-pointer items-center justify-between px-1 py-1 text-white/85">
										<span>Solutions</span>
										<ChevronDown size={16} className="transition group-open:rotate-180" />
									</summary>
									<div className="mt-2 grid grid-cols-1 gap-1">
										{items.map(({ title, Icon }) => (
											<a key={title} href="#" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white/80 transition hover:bg-white/5">
												<Icon size={16} className="text-indigo-300" />
												{title}
											</a>
										))}
									</div>
								</details>

								<a href="#free-features" className="block rounded-md px-3 py-2 text-white/85 transition hover:bg-white/5">Free Features</a>
								<a href="#pricing" className="block rounded-md px-3 py-2 text-white/85 transition hover:bg-white/5">Pricing</a>
								<div className="mt-4 flex items-center gap-3">
									<button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85">Login</button>
									<button onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })} className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/95">Sign Up</button>
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


