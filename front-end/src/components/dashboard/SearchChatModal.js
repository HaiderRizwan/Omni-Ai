import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const SearchChatModal = ({ isOpen, onClose, chats = [], onChatSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            setSearchTerm('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const filteredChats = chats.filter(chat =>
        chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chat.messages && chat.messages.some(m =>
            typeof m.content === 'string' && m.content.toLowerCase().includes(searchTerm.toLowerCase())
        ))
    ).slice(0, 50); // Limit to top 50 results

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredChats.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredChats.length) % filteredChats.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredChats[selectedIndex]) {
                    handleSelect(filteredChats[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredChats, selectedIndex, onClose]);

    const handleSelect = (chat) => {
        onChatSelect(chat);
        onClose();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-[#0b0b0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[60vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setSelectedIndex(0); }}
                                placeholder="Search chats..."
                                className="flex-1 bg-transparent border-none text-white text-lg placeholder-gray-500 focus:ring-0 focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded-md bg-white/10 text-xs text-gray-400 border border-white/5 font-mono">ESC</span>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {filteredChats.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">
                                    <p>No chats found matching "{searchTerm}"</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredChats.map((chat, index) => (
                                        <button
                                            key={chat.id || chat.serverId || index}
                                            onClick={() => handleSelect(chat)}
                                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between group transition-colors ${index === selectedIndex ? 'bg-[var(--primary)] text-black' : 'text-gray-300 hover:bg-white/5'
                                                }`}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${index === selectedIndex ? 'text-black/70' : 'text-gray-500'}`} />
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-medium truncate ${index === selectedIndex ? 'text-black' : 'text-gray-200'}`}>
                                                        {chat.title || 'Untitled Chat'}
                                                    </p>
                                                    <p className={`text-xs truncate ${index === selectedIndex ? 'text-black/60' : 'text-gray-500'}`}>
                                                        {/* Show snippet of matching message or last message */}
                                                        {chat.lastMessage || formatDate(chat.timestamp)}
                                                    </p>
                                                </div>
                                            </div>

                                            {index === selectedIndex && (
                                                <CornerDownLeft className="w-4 h-4 text-black/50" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/10 bg-white/[0.02] text-xs text-gray-500 flex justify-between px-4">
                            <span>{filteredChats.length} results</span>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3 rotate-90" />
                                    <ArrowRight className="w-3 h-3 -rotate-90" />
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <CornerDownLeft className="w-3 h-3" />
                                    Select
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SearchChatModal;
