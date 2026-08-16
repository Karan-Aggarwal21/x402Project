"use client";

import React from "react";

export function WardenIllustration({ className = "w-full max-w-lg h-auto" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 700 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-lg"
      >
        <defs>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
          </filter>

          <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <linearGradient id="robot-body-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <linearGradient id="guard-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>

          <linearGradient id="uniform-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Soft Background Clouds */}
        <g opacity="0.35">
          <path
            d="M 120 120 Q 140 90 180 95 Q 220 90 235 120 Z"
            fill="#ffffff"
          />
          <path
            d="M 450 100 Q 480 70 530 80 Q 570 75 590 100 Z"
            fill="#ffffff"
          />
        </g>

        {/* Horizontal Ground Line */}
        <line x1="80" y1="290" x2="620" y2="290" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

        {/* ROBOT CHARACTER (LEFT) */}
        <g id="robot" transform="translate(130, 80)">
          {/* Antenna */}
          <line x1="80" y1="20" x2="80" y2="0" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="0" r="5" fill="#64748b" stroke="#334155" strokeWidth="3" />

          {/* Ears / Side Bolt Dials */}
          <rect x="26" y="44" width="12" height="24" rx="5" fill="#94a3b8" stroke="#334155" strokeWidth="3.5" />
          <rect x="122" y="44" width="12" height="24" rx="5" fill="#94a3b8" stroke="#334155" strokeWidth="3.5" />

          {/* Head */}
          <rect
            x="34"
            y="20"
            width="92"
            height="72"
            rx="18"
            fill="url(#robot-body-grad)"
            stroke="#334155"
            strokeWidth="4"
          />

          {/* Face Screen Screen Inset */}
          <rect x="44" y="30" width="72" height="52" rx="12" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />

          {/* Eyes */}
          <circle cx="62" cy="54" r="5" fill="#1e293b" />
          <circle cx="98" cy="54" r="5" fill="#1e293b" />

          {/* Friendly Smile */}
          <path d="M 74 62 Q 80 68 86 62" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Neck */}
          <rect x="70" y="92" width="20" height="8" rx="3" fill="#cbd5e1" stroke="#334155" strokeWidth="3.5" />

          {/* Torso / Body */}
          <path
            d="M 52 100 L 108 100 L 118 175 Q 118 185 105 185 L 55 185 Q 42 185 42 175 Z"
            fill="url(#robot-body-grad)"
            stroke="#334155"
            strokeWidth="4"
          />

          {/* Body Chest Panel Inset */}
          <rect x="60" y="112" width="40" height="48" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="68" y1="124" x2="92" y2="124" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="68" y1="134" x2="88" y2="134" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />

          {/* Left Arm */}
          <path
            d="M 44 110 Q 22 135 34 165 Q 44 165 48 155 L 48 115 Z"
            fill="#e2e8f0"
            stroke="#334155"
            strokeWidth="3.5"
          />

          {/* Right Arm holding card */}
          <path
            d="M 106 112 Q 130 118 160 128"
            stroke="#334155"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 106 112 Q 130 118 160 128"
            stroke="#e2e8f0"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Robot Hand Grip */}
          <circle cx="162" cy="128" r="8" fill="#e2e8f0" stroke="#334155" strokeWidth="3.5" />

          {/* ETH Payment Device / Card */}
          <g transform="translate(160, 102)">
            <rect
              x="0"
              y="0"
              width="24"
              height="38"
              rx="4"
              fill="#ffffff"
              stroke="#334155"
              strokeWidth="3"
            />
            {/* Radiating Antenna Signals */}
            <path d="M 5 -6 L 7 -2" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 12 -9 L 12 -4" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 19 -6 L 17 -2" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

            {/* Ethereum Diamond */}
            <polygon points="12,8 6,18 12,15 18,18" fill="#475569" />
            <polygon points="12,16 6,19 12,28 18,19" fill="#334155" />
          </g>
        </g>

        {/* CONNECTION SIGNAL TRAJECTORY */}
        <g id="signal-stream">
          <line
            x1="316"
            y1="222"
            x2="430"
            y2="222"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          {/* Intercepted Red Attack Dot */}
          <line
            x1="480"
            y1="222"
            x2="520"
            y2="222"
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray="4 6"
            strokeLinecap="round"
            opacity="0.8"
          />
          <circle cx="530" cy="222" r="7" fill="#ef4444" stroke="#b91c1c" strokeWidth="2.5" />
        </g>

        {/* GUARD CHARACTER (RIGHT) */}
        <g id="guard" transform="translate(390, 70)">
          {/* Legs */}
          <path d="M 64 210 L 64 140 L 98 140 L 98 210 L 88 210 L 82 165 L 74 210 Z" fill="#cbd5e1" stroke="#334155" strokeWidth="4" />
          
          {/* Shoes */}
          <rect x="56" y="210" width="18" height="10" rx="4" fill="#1e293b" />
          <rect x="88" y="210" width="18" height="10" rx="4" fill="#1e293b" />

          {/* Torso Uniform */}
          <path
            d="M 46 95 L 114 95 L 118 145 L 42 145 Z"
            fill="url(#uniform-grad)"
            stroke="#334155"
            strokeWidth="4"
          />

          {/* Belt */}
          <rect x="42" y="140" width="76" height="8" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="74" y="138" width="12" height="12" rx="2" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />

          {/* Collar & Tie */}
          <polygon points="80,95 72,112 80,122 88,112" fill="#334155" />
          <polygon points="80,95 70,105 76,105" fill="#f8fafc" />
          <polygon points="80,95 90,105 84,105" fill="#f8fafc" />

          {/* Left Hand on Hip */}
          <path
            d="M 46 100 Q 26 120 38 145"
            stroke="#334155"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 46 100 Q 26 120 38 145"
            stroke="url(#uniform-grad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Head & Neck */}
          <rect x="72" y="80" width="16" height="18" rx="3" fill="url(#guard-skin)" stroke="#334155" strokeWidth="3.5" />
          <circle cx="80" cy="62" r="28" fill="url(#guard-skin)" stroke="#334155" strokeWidth="4" />

          {/* Face */}
          <circle cx="70" cy="60" r="3.5" fill="#1e293b" />
          <circle cx="88" cy="60" r="3.5" fill="#1e293b" />
          <path d="M 74 72 Q 80 77 86 72" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Hair */}
          <path d="M 52 58 Q 50 68 56 72" stroke="#334155" strokeWidth="3.5" fill="none" />
          <path d="M 108 58 Q 110 68 104 72" stroke="#334155" strokeWidth="3.5" fill="none" />

          {/* Guard Security Cap */}
          <path d="M 48 46 Q 80 40 112 46 L 118 52 Q 80 46 42 52 Z" fill="#1e293b" stroke="#334155" strokeWidth="3.5" />
          <path d="M 54 44 Q 80 18 106 44 Z" fill="#94a3b8" stroke="#334155" strokeWidth="4" />
          <polygon points="80,28 74,34 76,42 80,44 84,42 86,34" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />

          {/* Right Arm */}
          <path
            d="M 105 100 Q 120 120 115 140"
            stroke="#334155"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />

          {/* SHIELD WITH GREEN CHECKMARK */}
          <g id="shield" transform="translate(80, 85)" filter="url(#soft-shadow)">
            <path
              d="M 35 15 L 68 28 C 68 75 42 105 35 112 C 28 105 2 75 2 28 Z"
              fill="url(#shield-grad)"
              stroke="#334155"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <path
              d="M 35 22 L 62 33 C 62 70 40 96 35 102 C 30 96 8 70 8 33 Z"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <path
              d="M 22 60 L 32 70 L 48 48"
              stroke="#10b981"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default WardenIllustration;
