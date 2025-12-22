import React from 'react';

const Logo = ({ className = "w-8 h-8" }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#CCFF00" />
                    <stop offset="100%" stopColor="#99CC00" />
                </linearGradient>
            </defs>

            {/* Abstract Geometric Shape */}
            <path
                d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z"
                stroke="url(#logoGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="15" fill="url(#logoGradient)" />

            {/* Glow Effect */}
            <circle cx="50" cy="50" r="30" stroke="url(#logoGradient)" strokeWidth="2" strokeOpacity="0.3" />
        </svg>
    );
};

export default Logo;
