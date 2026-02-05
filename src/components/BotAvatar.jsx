import { useState, useEffect, useRef } from 'react';
import { useBotStore } from '../stores/botStore';
import { classNames } from '../utils/helpers';

// Motivational quotes for teletext display (when idle and online)
const MOTIVATIONAL_QUOTES = [
  'Ready to make today amazing ✨',
  'Every task is a step forward 🚀',
  'You\'ve got this! Let\'s do it 💪',
  'Small progress is still progress 📈',
  'Today is full of possibilities 🌟',
  'Focus on what matters most 🎯',
  'One task at a time, you\'ve got this 🎨',
  'Your future self will thank you 🙏',
  'Progress over perfection ⚡',
  'Let\'s turn ideas into reality 🛠️',
  'Every moment is a fresh start 🌱',
  'You\'re capable of amazing things 🌈',
  'Stay focused, stay positive ✨',
  'The best time to start is now ⏰',
  'Your effort today shapes tomorrow 🎯',
];

export default function BotAvatar({ enableEyeTracking = false }) {
  const [eyePosition, setEyePosition] = useState({ x: 50, y: 50 });
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  );
  const avatarRef = useRef(null);
  
  const { 
    inflightRequests,
    isConnected,
    getActivityStatus,
    startHealthChecks,
    stopHealthChecks
  } = useBotStore();
  
  const activityStatus = getActivityStatus();

  // Start OpenClaw health checks on mount
  useEffect(() => {
    startHealthChecks();
    return () => stopHealthChecks();
  }, [startHealthChecks, stopHealthChecks]);

  // Eye tracking effect (only if enabled)
  useEffect(() => {
    if (!enableEyeTracking || !avatarRef.current) return;

    const handleMouseMove = (e) => {
      const avatar = avatarRef.current;
      if (!avatar) return;

      const rect = avatar.getBoundingClientRect();
      const avatarCenterX = rect.left + rect.width / 2;
      const avatarCenterY = rect.top + rect.height / 2;

      // Calculate angle from avatar center to mouse
      const deltaX = e.clientX - avatarCenterX;
      const deltaY = e.clientY - avatarCenterY;
      const angle = Math.atan2(deltaY, deltaX);

      // Convert to percentage position (limited range for natural look)
      const maxOffset = 30; // Max 30% offset from center
      const distance = Math.min(1, Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 200);
      const x = 50 + Math.cos(angle) * maxOffset * distance;
      const y = 50 + Math.sin(angle) * maxOffset * distance;

      setEyePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableEyeTracking]);

  // Rotate quotes every 5 minutes when online and idle
  useEffect(() => {
    // Only rotate when online and idle
    if (activityStatus !== 'Idle' || !isConnected) return;

    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => {
        // Pick a random different quote
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
        } while (nextIndex === prev && MOTIVATIONAL_QUOTES.length > 1);
        return nextIndex;
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [activityStatus, isConnected]);

  // Get current message based on status
  const getStatusMessage = () => {
    if (activityStatus === 'Offline') {
      return 'OFFLINE - RECONNECTING...';
    }
    if (activityStatus === 'Working') {
      return inflightRequests > 0 
        ? `WORKING ON ${inflightRequests} TASK${inflightRequests > 1 ? 'S' : ''}...`
        : 'WORKING...';
    }
    // Idle - show rotating motivational quote
    return MOTIVATIONAL_QUOTES[currentQuoteIndex].toUpperCase();
  };

  return (
    <div className="border-b border-dark-800 px-6 py-8">
      <style>{`
        /* Idle animations - smooth floating with breathing */
        @keyframes float-breathe-idle {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
          100% { transform: translateY(0px) scale(1); }
        }
        
        /* Working animations - static, no movement (eyes and hands animate separately) */
        @keyframes busy-work {
          0%, 100% { transform: none; }
        }
        
        /* Sleeping animations - breathing/snoring effect */
        @keyframes sleep-snore {
          0% { transform: scale(0.96); }
          40% { transform: scale(1.02); }
          50% { transform: scale(1.02); }
          60% { transform: scale(0.98); }
          100% { transform: scale(0.96); }
        }
        
        /* Eyes and effects */
        @keyframes blink {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0.2; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes glow-busy {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        /* Working animations - eyes looking around */
        @keyframes look-around {
          0%, 100% { transform: translateX(0px); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
        }
        
        /* Keyboard typing animation */
        @keyframes typing-left {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes typing-right {
          0%, 100% { transform: translateY(-2px); }
          50% { transform: translateY(0px); }
        }
        
        /* Headset glow */
        @keyframes headset-glow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        /* Ring heartbeat animations - slow pulsate like a heartbeat */
        @keyframes heartbeat-idle {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
          }
          7% { 
            transform: scale(1.015);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);
          }
          14% { 
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.1);
          }
          21% { 
            transform: scale(1.01);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
          }
          28%, 95% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        @keyframes heartbeat-working {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.5);
          }
          50% { 
            transform: scale(1.02);
            box-shadow: 0 0 0 5px rgba(234, 179, 8, 0.2);
          }
        }
        @keyframes heartbeat-offline {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          7% { 
            transform: scale(1.015);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
          }
          14% { 
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.1);
          }
          21% { 
            transform: scale(1.01);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
          }
          28%, 95% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        
        /* Teletext style animations */
        @keyframes teletext-fade {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
        @keyframes teletext-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-2px); }
        }
        @keyframes teletext-glitch {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        
        .teletext-display {
          font-family: 'Courier New', 'Courier', monospace;
          letter-spacing: 0.05em;
          color: #e2e8f0;
          text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.8);
          animation: teletext-fade 3s ease-in-out infinite;
        }
        
        .teletext-message {
          transition: opacity 0.5s ease-in-out;
        }
        
        /* State classes */
        .avatar-idle {
          animation: float-breathe-idle 4s ease-in-out infinite;
        }
        .avatar-working {
          animation: busy-work 1.2s ease-in-out infinite;
        }
        .avatar-sleeping {
          animation: sleep-snore 3s ease-in-out infinite;
        }
        .avatar-blink {
          animation: blink 5s ease-in-out infinite;
        }
        .antenna-glow {
          animation: glow 2.5s ease-in-out infinite;
        }
        .antenna-glow-busy {
          animation: glow-busy 0.6s ease-in-out infinite;
        }
        .eyes-looking {
          animation: look-around 2s ease-in-out infinite;
        }
        .hand-left-typing {
          animation: typing-left 0.4s ease-in-out infinite;
        }
        .hand-right-typing {
          animation: typing-right 0.4s ease-in-out infinite;
        }
        .headset-active {
          animation: headset-glow 1s ease-in-out infinite;
        }
        .ring-heartbeat-idle {
          animation: heartbeat-idle 4s ease-in-out infinite;
        }
        .ring-heartbeat-working {
          animation: heartbeat-working 1.5s ease-in-out infinite;
        }
        .ring-heartbeat-offline {
          animation: heartbeat-offline 4s ease-in-out infinite;
        }
      `}</style>
      
      {/* Large Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div 
          ref={avatarRef}
          className="relative w-28 h-28 mb-4"
        >
          {/* Circular border with status color and heartbeat */}
          <div className={classNames(
            "absolute inset-0 rounded-full border-4 flex items-center justify-center bg-dark-900",
            activityStatus === 'Offline' ? 'border-red-500 ring-heartbeat-offline' : 
            activityStatus === 'Working' ? 'border-yellow-500 ring-heartbeat-working' : 
            'border-green-500 ring-heartbeat-idle'
          )}>
            {/* Bot Face SVG - animated based on state */}
            <svg 
              viewBox="0 0 100 100" 
              className={classNames(
                "w-20 h-20",
                activityStatus === 'Offline' ? 'avatar-sleeping' :
                activityStatus === 'Working' ? 'avatar-working' :
                'avatar-idle'
              )}
              fill="none"
            >
              {/* Bot head shape */}
              <path
                d="M30 35 L30 70 Q30 75 35 75 L65 75 Q70 75 70 70 L70 35 Q70 30 65 30 L35 30 Q30 30 30 35 Z"
                fill="#d1d5db"
                opacity="0.9"
              />
              
              {/* Eyes - closed when offline, looking around when working, blinking when idle */}
              {activityStatus === 'Offline' ? (
                <g>
                  {/* Closed eyes - horizontal lines */}
                  <path d="M33 45 L47 45" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M53 45 L67 45" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Z's for sleeping */}
                  <text x="72" y="35" fill="#9ca3af" fontSize="10" fontWeight="bold" opacity="0.6">Z</text>
                  <text x="78" y="28" fill="#9ca3af" fontSize="8" fontWeight="bold" opacity="0.4">z</text>
                  <text x="82" y="23" fill="#9ca3af" fontSize="6" fontWeight="bold" opacity="0.3">z</text>
                </g>
              ) : activityStatus === 'Working' ? (
                <g className="eyes-looking">
                  {/* Left eye */}
                  <circle cx="40" cy="45" r="5" fill="#1f2937" />
                  {/* Right eye */}
                  <circle cx="60" cy="45" r="5" fill="#1f2937" />
                </g>
              ) : (
                <g className="avatar-blink">
                  {enableEyeTracking ? (
                    <>
                      {/* Left eye socket */}
                      <ellipse cx="40" cy="45" rx="8" ry="10" fill="#1f2937" />
                      {/* Right eye socket */}
                      <ellipse cx="60" cy="45" rx="8" ry="10" fill="#1f2937" />
                      {/* Left pupil */}
                      <circle 
                        cx={35 + (eyePosition.x - 50) * 0.15} 
                        cy={40 + (eyePosition.y - 50) * 0.15} 
                        r="3" 
                        fill="#9ca3af"
                        className="transition-all duration-100"
                      />
                      {/* Right pupil */}
                      <circle 
                        cx={55 + (eyePosition.x - 50) * 0.15} 
                        cy={40 + (eyePosition.y - 50) * 0.15} 
                        r="3" 
                        fill="#9ca3af"
                        className="transition-all duration-100"
                      />
                    </>
                  ) : (
                    <>
                      {/* Left eye */}
                      <circle cx="40" cy="45" r="5" fill="#1f2937" />
                      {/* Right eye */}
                      <circle cx="60" cy="45" r="5" fill="#1f2937" />
                    </>
                  )}
                </g>
              )}
              
              {/* Mouth - static line */}
              <path
                d="M40 60 L60 60"
                stroke="#1f2937"
                strokeWidth="2"
                strokeLinecap="round"
              />
              
              {/* Working accessories - headset and keyboard in foreground */}
              {activityStatus === 'Working' && (
                <>
                  {/* Customer support headset - behind keyboard */}
                  <g>
                    {/* Headband over head */}
                    <path
                      d="M25 35 Q50 25 75 35"
                      stroke="#eab308"
                      strokeWidth="2.5"
                      fill="none"
                      className="headset-active"
                    />
                    {/* Left ear piece */}
                    <rect x="22" y="35" width="6" height="10" rx="2" fill="#eab308" opacity="0.9" />
                    {/* Right ear piece */}
                    <rect x="72" y="35" width="6" height="10" rx="2" fill="#eab308" opacity="0.9" />
                    {/* Microphone boom */}
                    <path
                      d="M22 40 Q18 52 25 58"
                      stroke="#eab308"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Microphone */}
                    <circle cx="26" cy="58" r="2.5" fill="#eab308" opacity="0.9" />
                  </g>
                  
                  {/* Large keyboard with hands in FOREGROUND - appears closer to viewer */}
                  <g transform="translate(50, 85) scale(1.8) translate(-50, -45)">
                    {/* Keyboard base - larger and more prominent */}
                    <rect x="20" y="35" width="60" height="14" rx="3" fill="#374151" opacity="0.95">
                      <animate attributeName="opacity" values="0.95;0.98;0.95" dur="2s" repeatCount="indefinite" />
                    </rect>
                    {/* Keyboard border/shadow */}
                    <rect x="20" y="35" width="60" height="14" rx="3" fill="none" stroke="#1f2937" strokeWidth="1" opacity="0.5" />
                    
                    {/* Keyboard keys - 3 rows */}
                    {/* Top row */}
                    <rect x="23" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="30" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="37" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="44" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="51" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="58" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="65" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="72" y="38" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    
                    {/* Middle row */}
                    <rect x="25" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="32" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="39" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="46" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="53" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="60" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    <rect x="67" y="42" width="5" height="3" rx="0.5" fill="#6b7280" opacity="0.7" />
                    
                    {/* Bottom row - spacebar */}
                    <rect x="35" y="46" width="30" height="2" rx="0.5" fill="#6b7280" opacity="0.7" />
                    
                    {/* Large hands typing - in front of keyboard */}
                    {/* Left hand */}
                    <g className="hand-left-typing">
                      {/* Palm */}
                      <ellipse cx="32" cy="32" rx="6" ry="7" fill="#d1d5db" opacity="0.95" />
                      {/* Fingers */}
                      <rect x="28" y="32" width="2.5" height="5" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="31" y="32" width="2.5" height="6" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="34" y="32" width="2.5" height="5.5" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="37" y="32" width="2.5" height="4.5" rx="1" fill="#d1d5db" opacity="0.9" />
                    </g>
                    
                    {/* Right hand */}
                    <g className="hand-right-typing">
                      {/* Palm */}
                      <ellipse cx="68" cy="32" rx="6" ry="7" fill="#d1d5db" opacity="0.95" />
                      {/* Fingers */}
                      <rect x="61" y="32" width="2.5" height="4.5" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="64" y="32" width="2.5" height="5.5" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="67" y="32" width="2.5" height="6" rx="1" fill="#d1d5db" opacity="0.9" />
                      <rect x="70" y="32" width="2.5" height="5" rx="1" fill="#d1d5db" opacity="0.9" />
                    </g>
                  </g>
                </>
              )}
              
              {/* Antenna */}
              <line x1="50" y1="30" x2="50" y2="20" stroke="#d1d5db" strokeWidth="2" />
              <circle 
                cx="50" 
                cy="18" 
                r="3" 
                fill={activityStatus === 'Offline' ? '#ef4444' : activityStatus === 'Working' ? '#eab308' : '#3b82f6'}
                className={activityStatus === 'Working' ? 'antenna-glow-busy' : 'antenna-glow'}
              />
            </svg>
          </div>
        </div>

        {/* Bot Name */}
        <h2 className="text-xl font-bold text-dark-100 mb-2">MosBot</h2>
        
        {/* Status only - removed redundant mood */}
        <div className={classNames(
          'text-sm font-medium',
          activityStatus === 'Offline' ? 'text-red-400' :
          activityStatus === 'Working' ? 'text-yellow-400' :
          'text-green-400'
        )}>
          {activityStatus === 'Offline' ? 'Offline' :
           inflightRequests > 0 ? `${inflightRequests} task${inflightRequests > 1 ? 's' : ''} active` : 'Online'}
        </div>
      </div>

      {/* Teletext Style Status Bar */}
      <div
        className={classNames(
          'w-full px-4 py-3 rounded-lg text-xs font-bold transition-all duration-500',
          'teletext-display',
          'bg-dark-800/80 border-2 border-dark-700/50 backdrop-blur-sm'
        )}
        style={{
          fontFamily: "'Courier New', 'Courier', monospace",
          lineHeight: '1.4',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="select-none opacity-60">■</span>
          <span className="flex-1 text-center px-2 teletext-message">
            {getStatusMessage()}
          </span>
          <span className="select-none opacity-60">■</span>
        </div>
      </div>
    </div>
  );
}
