
import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Gamepad2, Map, Keyboard, X, Volume2, VolumeX, Mic2, User, PlayCircle, Briefcase, ShoppingCart, Check, Shirt, Activity, Zap, Calendar } from 'lucide-react';
import { GameMode } from '../types';
import { CONTROLS } from '../constants';

interface MainMenuProps {
  onSelectMode: (mode: GameMode) => void;
  hasActivePlayoff?: boolean;
  globalCoins: number;
  inventory: string[];
  onBuyItem: (item: string, cost: number) => boolean;
  onSetJerseyColors: (colors: { primary: string, secondary: string }) => void;
  customJerseyColors: { primary: string, secondary: string };
}

// AI-Style Rap/Hip-Hop Beats Playlist
const PLAYLIST = [
  'https://cdn.pixabay.com/audio/2022/05/17/audio_174b69e357.mp3', // Cinematic Hip Hop
  'https://cdn.pixabay.com/audio/2023/01/26/audio_1e10b08535.mp3', // Drill/Trap Beat
  'https://cdn.pixabay.com/audio/2022/03/21/audio_3db65e01f7.mp3', // Old School Vibe
  'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3'  // Aggressive Phonk/Rap
];

const SHOP_ITEMS = [
    { id: '6th_man', name: '6th Man', price: 400, desc: 'Boosts team stamina/depth.', icon: <User size={24}/> },
    { id: 'power_aid', name: 'Power Aid', price: 250, desc: 'Boosts team speed by +5.', icon: <Zap size={24}/> },
    { id: 'ankle_breaker', name: 'Ankle Breaker', price: 700, desc: 'Increases dribbling & shooting.', icon: <Activity size={24}/> },
    { id: 'customize_jersey', name: 'Customize Jersey', price: 1000, desc: 'Unlock custom team colors.', icon: <Shirt size={24}/> },
];

export const MainMenu: React.FC<MainMenuProps> = ({ 
    onSelectMode, 
    hasActivePlayoff, 
    globalCoins, 
    inventory, 
    onBuyItem, 
    onSetJerseyColors, 
    customJerseyColors 
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    const audio = new Audio();
    audio.volume = 0.4;
    audioRef.current = audio;

    const playTrack = (index: number) => {
        if (!audioRef.current) return;
        audioRef.current.src = `${PLAYLIST[index]}?t=${Date.now()}`;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => setIsMusicPlaying(true))
                .catch((e) => {
                    console.warn("Audio autoplay blocked or failed:", e);
                    setIsMusicPlaying(false);
                });
        }
    };

    audio.onended = () => {
        setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST.length);
    };
    audio.onerror = () => {
        setTimeout(() => {
             setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST.length);
        }, 500);
    };

    playTrack(currentTrackIndex);
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, [currentTrackIndex]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.warn("Play failed", e));
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const skipTrack = () => {
      setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST.length);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-black">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop')] bg-cover bg-center pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none"></div>

      {/* Header with Coin Display */}
      <div className="absolute top-6 right-8 z-20 flex gap-4">
          <button 
             onClick={() => setShowStore(true)}
             className="flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:scale-105 transition-transform"
          >
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-xs font-mono">$</div>
              <span>{globalCoins}</span>
              <ShoppingCart size={18} />
          </button>
      </div>

      <div className="z-10 flex flex-col items-center mb-8">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] font-[Teko] uppercase italic transform -skew-x-6">
            Hoops Legends
          </h1>
          <div className="text-gray-400 font-mono text-sm tracking-[0.5em] mt-2 uppercase">Street & Pro Basketball</div>
          <div className="text-gray-500 font-mono text-xs tracking-widest mt-1 uppercase">by James Kettinger</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 z-10 w-full max-w-7xl px-8">
        <MenuCard 
          title="Play Now" 
          icon={<Gamepad2 size={32} />} 
          desc="Quick 5v5 Match"
          color="blue"
          onClick={() => onSelectMode(GameMode.TEAM_SELECT)}
        />
        <MenuCard 
          title="Team Game" 
          icon={<Calendar size={32} />} 
          desc="Season Mode"
          color="orange"
          onClick={() => onSelectMode(GameMode.SEASON_HUB)} 
        />
        <MenuCard 
          title="My Career" 
          icon={<Briefcase size={32} />} 
          desc="Rise to Stardom"
          color="purple"
          onClick={() => onSelectMode(GameMode.MY_CAREER_HUB)} 
        />
        <MenuCard 
          title={hasActivePlayoff ? "Continue Playoffs" : "Playoffs"} 
          icon={hasActivePlayoff ? <PlayCircle size={32} /> : <Trophy size={32} />} 
          desc={hasActivePlayoff ? "Resume Finals Run" : "Tournament Mode"}
          color={hasActivePlayoff ? "green" : "yellow"} 
          onClick={() => onSelectMode(GameMode.PLAYOFFS)}
        />
        <MenuCard 
          title="Blacktop" 
          icon={<Map size={32} />} 
          desc="Street Rules"
          color="red"
          onClick={() => onSelectMode(GameMode.BLACKTOP_SELECT)} 
        />
        <MenuCard 
          title="Practice" 
          icon={<User size={32} />} 
          desc="Freestyle Shootaround"
          color="cyan"
          onClick={() => onSelectMode(GameMode.PRACTICE_SELECT)} 
        />
      </div>

      {/* Buttons Row */}
      <div className="mt-10 z-10 flex gap-4">
        <button 
            onClick={() => setShowControls(true)}
            className="flex items-center gap-2 px-6 py-2 bg-slate-800/60 border border-slate-600 rounded-full hover:bg-slate-700 transition-colors text-gray-300 hover:text-white"
        >
            <Keyboard size={20} />
            <span className="font-[Teko] text-xl tracking-widest pt-1">CONTROLS</span>
        </button>
        
        <div className="flex items-center bg-slate-900/80 rounded-full border border-slate-700 overflow-hidden">
            <button 
                onClick={toggleMusic}
                className={`flex items-center gap-2 px-4 py-2 transition-colors ${isMusicPlaying ? 'text-green-400' : 'text-gray-500'}`}
            >
                {isMusicPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <div className="h-full w-px bg-slate-700"></div>
            <button onClick={skipTrack} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 text-gray-300 hover:text-white">
                <Mic2 size={16} />
                <span className="font-[Teko] text-lg tracking-widest pt-1">AI RAP RADIO: TRACK {currentTrackIndex + 1}</span>
            </button>
        </div>
      </div>

      {/* Controls Modal */}
      {showControls && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in-up">
           <div className="bg-slate-900 border-2 border-slate-600 p-8 rounded-2xl w-[90%] max-w-md shadow-2xl relative">
              <button onClick={() => setShowControls(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
              <h2 className="text-4xl font-[Teko] text-white uppercase text-center mb-6 tracking-widest border-b border-slate-700 pb-4">Keyboard Controls</h2>
              <div className="space-y-4">
                {CONTROLS.map((c, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="bg-slate-800 px-3 py-1 rounded border border-slate-700 text-yellow-500 font-mono font-bold text-sm">{c.key}</div>
                    <div className="text-gray-300 font-[Teko] text-xl tracking-wide uppercase">{c.action}</div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Global Store Modal */}
      {showStore && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-up">
              <div className="bg-slate-900 border-2 border-yellow-600 p-8 rounded-2xl w-[90%] max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh]">
                  <button onClick={() => setShowStore(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                  
                  <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
                      <h2 className="text-4xl font-[Teko] text-yellow-500 uppercase tracking-widest">Coin Shop</h2>
                      <div className="bg-slate-800 px-4 py-2 rounded-lg text-white font-mono flex items-center gap-2">
                          Balance: <span className="text-yellow-400 font-bold">{globalCoins}</span> Coins
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2">
                      {SHOP_ITEMS.map(item => {
                          const isOwned = inventory.includes(item.id);
                          return (
                              <div key={item.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${isOwned ? 'border-green-500 bg-green-900/20' : 'border-slate-700 bg-slate-800 hover:border-yellow-500/50'}`}>
                                  <div className={`p-4 rounded-full ${isOwned ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'}`}>
                                      {isOwned ? <Check size={24} /> : item.icon}
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="text-2xl font-[Teko] uppercase text-white">{item.name}</h3>
                                      <p className="text-xs text-gray-400 font-mono">{item.desc}</p>
                                  </div>
                                  <div>
                                      {isOwned ? (
                                          <span className="text-green-400 font-bold uppercase text-sm tracking-wider">OWNED</span>
                                      ) : (
                                          <button 
                                            onClick={() => {
                                                if (onBuyItem(item.id, item.price)) {
                                                    // Success sound or feedback could go here
                                                } else {
                                                    alert("Not enough coins!");
                                                }
                                            }}
                                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded uppercase text-sm"
                                          >
                                              Buy {item.price}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Jersey Customizer Section (Only if Owned) */}
                  {inventory.includes('customize_jersey') && (
                      <div className="mt-8 border-t border-slate-700 pt-6 animate-fade-in-up">
                          <h3 className="text-2xl font-[Teko] text-white uppercase mb-4 flex items-center gap-2">
                              <Shirt size={24} className="text-purple-400" /> Jersey Customizer
                          </h3>
                          <div className="grid grid-cols-2 gap-8">
                              <div>
                                  <label className="block text-xs text-gray-400 mb-2 uppercase">Primary Color</label>
                                  <div className="flex gap-2 flex-wrap">
                                      {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                                          <button 
                                            key={c}
                                            onClick={() => onSetJerseyColors({...customJerseyColors, primary: c})}
                                            className={`w-8 h-8 rounded-full border-2 ${customJerseyColors.primary === c ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                          />
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs text-gray-400 mb-2 uppercase">Secondary Color</label>
                                  <div className="flex gap-2 flex-wrap">
                                      {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                                          <button 
                                            key={c}
                                            onClick={() => onSetJerseyColors({...customJerseyColors, secondary: c})}
                                            className={`w-8 h-8 rounded-full border-2 ${customJerseyColors.secondary === c ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                          />
                                      ))}
                                  </div>
                              </div>
                          </div>
                          <div className="mt-4 p-4 bg-slate-800 rounded flex items-center justify-center">
                              <div className="w-16 h-16 rounded border-2 border-white/20 flex items-center justify-center font-bold text-2xl shadow-lg"
                                   style={{ backgroundColor: customJerseyColors.primary, color: customJerseyColors.secondary }}>
                                   23
                              </div>
                              <span className="ml-4 text-gray-400 text-sm">Preview</span>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

const MenuCard: React.FC<{ title: string, icon: React.ReactNode, desc: string, color: string, onClick: () => void }> = ({ title, icon, desc, color, onClick }) => {
  const colorClasses = {
    blue: "hover:shadow-blue-500/50 hover:border-blue-500",
    yellow: "hover:shadow-yellow-500/50 hover:border-yellow-500",
    red: "hover:shadow-red-500/50 hover:border-red-500",
    green: "hover:shadow-green-500/50 hover:border-green-500",
    cyan: "hover:shadow-cyan-500/50 hover:border-cyan-500",
    purple: "hover:shadow-purple-500/50 hover:border-purple-500",
    orange: "hover:shadow-orange-500/50 hover:border-orange-500"
  };

  return (
    <button 
      onClick={onClick}
      className={`group relative bg-slate-800/80 backdrop-blur-sm border-2 border-slate-700 p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="mb-4 text-white group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-3xl font-bold text-white mb-1 font-[Teko] uppercase tracking-wide">{title}</h3>
      <p className="text-gray-400 font-mono text-xs group-hover:text-white transition-colors uppercase">{desc}</p>
    </button>
  );
};
