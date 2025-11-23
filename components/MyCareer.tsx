
import React, { useState, useEffect } from 'react';
import { CareerSave, CareerPhase, Team, Position } from '../types';
import { TEAMS } from '../constants';
import { User, MapPin, ShoppingBag, Briefcase, Play, Save, Trash2, CheckCircle, X, RefreshCw, Dumbbell, Zap, Shield, Activity, Home, Heart, Pizza, DollarSign, CloudRain, Backpack } from 'lucide-react';

interface MyCareerProps {
    saves: CareerSave[];
    onUpdateSave: (save: CareerSave) => void;
    onDeleteSave: (id: number) => void;
    onPlayGame: (save: CareerSave, isCollege?: boolean, isWager?: boolean, wagerAmount?: number) => void;
    onBack: () => void;
}

export const MyCareer: React.FC<MyCareerProps> = ({ saves, onUpdateSave, onDeleteSave, onPlayGame, onBack }) => {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [activeSave, setActiveSave] = useState<CareerSave | null>(null);
    
    // Creation Form State
    const [formData, setFormData] = useState({ name: '', height: "6'3\"", weight: '195 lbs', position: Position.PG, number: '23' });
    
    // Narrative State
    const [narrativeText, setNarrativeText] = useState('');
    const [showNarrative, setShowNarrative] = useState(false);
    const [draftReveal, setDraftReveal] = useState(false);

    // Trade UI State
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [tradeTarget, setTradeTarget] = useState<Team | null>(null);

    // City Roleplay UI State
    const [showGym, setShowGym] = useState(false);
    const [showCrib, setShowCrib] = useState(false);
    const [showNeighborhood, setShowNeighborhood] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [wagerInput, setWagerInput] = useState(50);

    const handleSlotClick = (index: number) => {
        const save = saves.find(s => s.id === index);
        if (save) {
            // Ensure lifestyle exists for old saves
            if (!save.lifestyle) {
                save.lifestyle = { houseLevel: 0, hasWife: false, relationshipProgress: 0, foodLevel: 50, dripLevel: 0 };
            }
            setActiveSave(save);
        } else {
            // New Game
            setSelectedSlot(index);
            setActiveSave(null); // Trigger creation mode
        }
    };

    const createPlayer = () => {
        if (!selectedSlot) return;
        const newSave: CareerSave = {
            id: selectedSlot,
            name: formData.name || 'Rookie',
            height: formData.height,
            weight: formData.weight,
            teamId: 'college', // Starts in college
            coins: 0,
            phase: CareerPhase.COLLEGE_GAME,
            inventory: [],
            stats: { rings: 0, ppg: 0, gamesPlayed: 0 },
            lifestyle: { houseLevel: 0, hasWife: false, relationshipProgress: 0, foodLevel: 80, dripLevel: 0 }, // Start homeless
            playerData: {
                id: `mc_${Date.now()}`,
                name: formData.name || 'Rookie',
                number: formData.number,
                position: formData.position,
                rating: 65,
                speed: 85,
                shooting: 75,
                defense: 70,
                accessories: []
            }
        };
        onUpdateSave(newSave);
        setActiveSave(newSave);
        setSelectedSlot(null);
    };

    // Narrative Logic Effect
    useEffect(() => {
        if (!activeSave) return;

        if (activeSave.phase === CareerPhase.COACH_TALK) {
            setShowNarrative(true);
            setNarrativeText("Coach: 'Great game out there, kid. I know it's tough losing your last college game, but you've got a bright future. The NBA scouts are watching.'");
        } else if (activeSave.phase === CareerPhase.DRAFT) {
            setShowNarrative(true);
            setNarrativeText("1 Month Later...");
            setTimeout(() => {
                setDraftReveal(true);
            }, 3000);
        }
    }, [activeSave]);

    const advancePhase = () => {
        if (!activeSave) return;

        if (activeSave.phase === CareerPhase.COLLEGE_GAME) {
            onPlayGame(activeSave, true);
        } else if (activeSave.phase === CareerPhase.COACH_TALK) {
            const updated = { ...activeSave, phase: CareerPhase.DRAFT };
            onUpdateSave(updated);
            setActiveSave(updated);
            setShowNarrative(false);
        } else if (activeSave.phase === CareerPhase.DRAFT) {
            // Determine Team
            const randomTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
            setNarrativeText(`With the 1st Pick in the NBA Draft, the ${randomTeam.name} select... ${activeSave.name}!`);
            
            setTimeout(() => {
                 const updated = { ...activeSave, phase: CareerPhase.SKILLS_CHALLENGE, teamId: randomTeam.id };
                 // Update player stats to be passable NBA level
                 updated.playerData.rating = 70; // Base rookie rating
                 onUpdateSave(updated);
                 setActiveSave(updated);
                 setDraftReveal(false);
                 setShowNarrative(false);
            }, 4000);
        } else if (activeSave.phase === CareerPhase.SKILLS_CHALLENGE) {
             // Triggers the actual game
             onPlayGame(activeSave, false);
        }
    };

    const openTradeMenu = () => {
        if (!activeSave) return;
        const currentTeamId = activeSave.teamId;
        const otherTeams = TEAMS.filter(t => t.id !== currentTeamId);
        const randomTeam = otherTeams[Math.floor(Math.random() * otherTeams.length)];
        setTradeTarget(randomTeam);
        setShowTradeModal(true);
    };

    const acceptTrade = () => {
        if (!activeSave || !tradeTarget) return;
        const updated = { ...activeSave, teamId: tradeTarget.id };
        onUpdateSave(updated);
        setActiveSave(updated);
        setShowTradeModal(false);
    };

    const buyItem = (item: string, cost: number) => {
        if (!activeSave) return;
        if (activeSave.inventory.includes(item)) {
            alert("You already own this item!");
            return;
        }

        if (activeSave.coins >= cost) {
            const updated = { 
                ...activeSave, 
                coins: activeSave.coins - cost,
                inventory: [...activeSave.inventory, item]
            };
            onUpdateSave(updated);
            setActiveSave(updated);
            alert("Purchased! Check your Inventory to equip it.");
        } else {
            alert("Not enough coins! Go hustle on the streets or play NBA games.");
        }
    };

    const toggleEquip = (item: string) => {
        if (!activeSave) return;
        let currentAccessories = activeSave.playerData.accessories || [];
        
        if (currentAccessories.includes(item)) {
            // Unequip
            currentAccessories = currentAccessories.filter(i => i !== item);
        } else {
            // Equip
            currentAccessories = [...currentAccessories, item];
        }

        const updated = {
            ...activeSave,
            playerData: {
                ...activeSave.playerData,
                accessories: currentAccessories
            }
        };
        onUpdateSave(updated);
        setActiveSave(updated);
    };

    const buyHouse = (level: number, cost: number) => {
        if (!activeSave) return;
        if (activeSave.coins >= cost) {
            const updated = {
                ...activeSave,
                coins: activeSave.coins - cost,
                lifestyle: { ...activeSave.lifestyle, houseLevel: level }
            };
            onUpdateSave(updated);
            setActiveSave(updated);
        } else {
            alert("You can't afford this crib yet.");
        }
    };

    const performLifeAction = (action: 'eat' | 'date') => {
        if (!activeSave) return;
        
        if (action === 'eat') {
             if (activeSave.coins >= 20) {
                 const updated = {
                     ...activeSave,
                     coins: activeSave.coins - 20,
                     lifestyle: { ...activeSave.lifestyle, foodLevel: Math.min(100, activeSave.lifestyle.foodLevel + 30) }
                 };
                 onUpdateSave(updated);
                 setActiveSave(updated);
             } else alert("You're broke! Can't even afford a burger.");
        }

        if (action === 'date') {
            if (activeSave.lifestyle.hasWife) return;
            if (activeSave.coins >= 100) {
                 const success = Math.random() > 0.4;
                 let newProgress = activeSave.lifestyle.relationshipProgress + (success ? 20 : 5);
                 let hasWife = activeSave.lifestyle.hasWife;
                 
                 if (newProgress >= 100) {
                     newProgress = 100;
                     hasWife = true;
                     alert("She said YES! You got married.");
                 } else {
                     alert(success ? "Date went great!" : "Date was okay...");
                 }

                 const updated = {
                     ...activeSave,
                     coins: activeSave.coins - 100,
                     lifestyle: { ...activeSave.lifestyle, relationshipProgress: newProgress, hasWife }
                 };
                 onUpdateSave(updated);
                 setActiveSave(updated);
            } else alert("Dates are expensive. Get more money.");
        }
    };

    const playWagerMatch = () => {
        if (!activeSave) return;
        if (activeSave.coins >= wagerInput) {
             const updated = { ...activeSave, coins: activeSave.coins - wagerInput };
             onUpdateSave(updated); // Deduct wager immediately
             onPlayGame(activeSave, false, true, wagerInput);
        } else {
            alert("You don't have enough coins to cover that bet!");
        }
    };

    const upgradeStat = (stat: 'shooting' | 'speed' | 'defense') => {
        if (!activeSave) return;
        const currentVal = activeSave.playerData[stat];
        if (currentVal >= 99) return;
        
        const cost = Math.floor(currentVal * 5); // Scaling cost
        if (activeSave.coins >= cost) {
            const updated = {
                ...activeSave,
                coins: activeSave.coins - cost,
                playerData: {
                    ...activeSave.playerData,
                    [stat]: currentVal + 1,
                    rating: Math.floor((activeSave.playerData.shooting + activeSave.playerData.defense + activeSave.playerData.speed + 1) / 3)
                }
            };
            onUpdateSave(updated);
            setActiveSave(updated);
        }
    };

    // --- RENDERERS ---

    if (draftReveal) {
        return (
            <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white animate-fade-in-up">
                <h1 className="text-6xl font-[Teko] text-yellow-400 mb-8">NBA DRAFT LOTTERY</h1>
                <div className="w-64 h-64 rounded-full border-8 border-white animate-spin flex items-center justify-center bg-slate-800">
                    <span className="text-4xl font-bold">?</span>
                </div>
                <p className="mt-8 text-2xl font-mono animate-pulse">Selecting 1st Overall Pick...</p>
            </div>
        );
    }

    if (showNarrative) {
         return (
             <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1516475429286-465d815a0df4?q=80&w=2000')] bg-cover flex items-end pb-20 justify-center">
                 <div className="bg-black/90 p-8 max-w-4xl border-2 border-white rounded-xl text-white animate-fade-in-up cursor-pointer" onClick={advancePhase}>
                     <h3 className="text-yellow-400 font-bold mb-2 uppercase">Story</h3>
                     <p className="text-2xl font-mono typing-effect">{narrativeText}</p>
                     <div className="mt-4 text-right text-xs text-gray-500">Click to continue...</div>
                 </div>
             </div>
         );
    }

    // College Game Prologue
    if (activeSave && activeSave.phase === CareerPhase.COLLEGE_GAME) {
        return (
             <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2093')] bg-cover bg-center">
                 <div className="bg-black/80 p-12 rounded-2xl border-4 border-yellow-500 text-center max-w-3xl animate-fade-in-up backdrop-blur-sm">
                     <h1 className="text-6xl font-[Teko] text-yellow-400 mb-4 uppercase">The Prologue</h1>
                     <h2 className="text-3xl font-bold mb-6">NCAA Championship Final</h2>
                     <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                         This is it. The final game of your college career. Scouts from every NBA team are in the stands watching your every move. 
                         Win or lose, leave everything on the court and secure your spot as the #1 Pick.
                     </p>
                     
                     <div className="flex items-center justify-center gap-8 mb-8">
                         <div className="text-center">
                             <div className="text-4xl font-bold text-orange-500">TIGERS</div>
                             <div className="text-sm text-gray-400">Your Team</div>
                         </div>
                         <div className="text-2xl font-bold">VS</div>
                         <div className="text-center">
                             <div className="text-4xl font-bold text-red-600">CRIMSON</div>
                             <div className="text-sm text-gray-400">State Rivals</div>
                         </div>
                     </div>

                     <button 
                        onClick={() => onPlayGame(activeSave, true)}
                        className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-[Teko] text-3xl font-bold uppercase rounded shadow-[0_0_20px_rgba(234,179,8,0.5)] transform hover:scale-105 transition-all"
                     >
                         Play Championship Game
                     </button>
                 </div>
             </div>
        );
    }

    // Hub View (City)
    if (activeSave && activeSave.phase === CareerPhase.NBA_SEASON) {
        const team = TEAMS.find(t => t.id === activeSave.teamId) || TEAMS[0];
        const life = activeSave.lifestyle || { houseLevel: 0, hasWife: false, relationshipProgress: 0, foodLevel: 50, dripLevel: 0 };
        const myAccessories = activeSave.playerData.accessories || [];

        return (
            <div className="w-full h-full relative bg-slate-900 text-white">
                {/* Header */}
                <div className="absolute top-0 w-full p-6 flex justify-between items-center bg-gradient-to-b from-black to-transparent z-10">
                    <button onClick={() => setActiveSave(null)} className="text-gray-300 font-bold hover:text-white flex items-center gap-2">
                        <Save size={18} /> SAVE & EXIT
                    </button>
                    <div className="flex items-center gap-4">
                         <button 
                            onClick={() => setShowInventory(true)}
                            className="bg-slate-800 text-white border border-slate-600 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors"
                         >
                             <Backpack size={18} className="text-blue-400"/> INVENTORY
                         </button>
                         <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                             <div className="w-4 h-4 rounded-full bg-black/20"></div>
                             <span>{activeSave.coins} COINS</span>
                         </div>
                    </div>
                </div>

                {/* City Background */}
                <div className="w-full h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0">
                    {/* Arena */}
                    <div 
                        onClick={() => onPlayGame(activeSave)}
                        className="relative group bg-[url('https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1000')] bg-cover bg-center border border-black hover:opacity-100 opacity-80 transition-all cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center">
                             <Play size={48} className="text-white mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase text-white drop-shadow-lg">NBA Arena</h2>
                             <div className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase rounded inline-block">Season Game</div>
                        </div>
                    </div>

                    {/* The Gym */}
                    <div 
                        onClick={() => setShowGym(true)}
                        className="relative group bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000')] bg-cover bg-center border border-black hover:opacity-100 opacity-80 transition-all cursor-pointer flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center">
                             <Dumbbell size={48} className="text-orange-400 mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase text-white drop-shadow-lg">The Gym</h2>
                             <div className="mt-2 px-3 py-1 bg-orange-600 text-white text-xs font-bold uppercase rounded inline-block">Train Stats</div>
                        </div>
                    </div>

                    {/* The Neighborhood (Street Wagers) */}
                    <div 
                        onClick={() => setShowNeighborhood(true)}
                        className="relative group bg-[url('https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070')] bg-cover bg-center border border-black hover:opacity-100 opacity-80 transition-all cursor-pointer flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center">
                             <MapPin size={48} className="text-purple-400 mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase text-white drop-shadow-lg">The Hood</h2>
                             <div className="mt-2 px-3 py-1 bg-purple-600 text-white text-xs font-bold uppercase rounded inline-block">Play Wagers</div>
                        </div>
                    </div>

                    {/* My Crib (Roleplay) */}
                    <div 
                        onClick={() => setShowCrib(true)}
                        className="relative group bg-[url('https://images.unsplash.com/photo-1484154218962-a1c002085d2f?q=80&w=2071')] bg-cover bg-center border border-black hover:opacity-100 opacity-80 transition-all cursor-pointer flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center">
                             <Home size={48} className="text-cyan-400 mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase text-white drop-shadow-lg">My Crib</h2>
                             <div className="text-xs text-gray-300 font-mono mb-2">
                                 {life.houseLevel === 0 ? "Streets" : (life.houseLevel === 1 ? "Apartment" : (life.houseLevel === 2 ? "Penthouse" : "Mansion"))}
                             </div>
                             <div className="flex justify-center gap-2 text-xs">
                                 <span className={life.foodLevel < 20 ? 'text-red-500 animate-pulse' : 'text-green-400'}>Food: {life.foodLevel}%</span>
                             </div>
                        </div>
                    </div>

                    {/* The Mall */}
                    <div className="relative group bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000')] bg-cover bg-center border border-black hover:opacity-100 opacity-80 transition-all flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center p-4">
                             <ShoppingBag size={48} className="text-green-400 mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase mb-2 text-white drop-shadow-lg">The Mall</h2>
                             <div className="space-y-2 w-full max-w-xs bg-black/60 p-4 rounded-xl backdrop-blur-sm mx-auto">
                                 <button onClick={() => buyItem('headband', 200)} className="w-full bg-white/10 hover:bg-white/20 p-2 rounded flex justify-between items-center border border-white/10">
                                     <span className="text-sm">Headband</span> 
                                     {activeSave.inventory.includes('headband') ? <span className="text-green-400 font-bold">OWNED</span> : <span className="text-yellow-400 font-bold">200c</span>}
                                 </button>
                                 <button onClick={() => buyItem('sleeves', 500)} className="w-full bg-white/10 hover:bg-white/20 p-2 rounded flex justify-between items-center border border-white/10">
                                     <span className="text-sm">Arm Sleeves</span> 
                                     {activeSave.inventory.includes('sleeves') ? <span className="text-green-400 font-bold">OWNED</span> : <span className="text-yellow-400 font-bold">500c</span>}
                                 </button>
                                 <button onClick={() => buyItem('drip_outfit', 1500)} className="w-full bg-white/10 hover:bg-white/20 p-2 rounded flex justify-between items-center border border-white/10">
                                     <span className="text-sm">Streetwear Drip</span> 
                                     {activeSave.inventory.includes('drip_outfit') ? <span className="text-green-400 font-bold">OWNED</span> : <span className="text-yellow-400 font-bold">1500c</span>}
                                 </button>
                             </div>
                        </div>
                    </div>

                    {/* GM Office */}
                    <div 
                        onClick={openTradeMenu}
                        className="relative group bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000')] bg-cover bg-center hover:opacity-100 opacity-80 transition-all cursor-pointer flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors"></div>
                        <div className="z-10 text-center">
                             <Briefcase size={48} className="text-blue-400 mx-auto mb-2" />
                             <h2 className="text-4xl font-[Teko] uppercase mb-4 text-white drop-shadow-lg">GM Office</h2>
                             <button className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full font-bold uppercase text-sm shadow-lg">Request Trade</button>
                        </div>
                    </div>
                </div>

                {/* Inventory Modal */}
                {showInventory && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                        <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-8 max-w-lg w-full shadow-2xl relative">
                            <button onClick={() => setShowInventory(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                            <h2 className="text-4xl font-[Teko] text-white uppercase mb-6 flex items-center gap-2">
                                <Backpack className="text-blue-500" size={32} /> My Bag
                            </h2>

                            {activeSave.inventory.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                                    <p>Your bag is empty.</p>
                                    <p className="text-sm">Visit the Mall to buy gear!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {activeSave.inventory.map(item => {
                                        const isEquipped = myAccessories.includes(item);
                                        const displayNames: {[key:string]: string} = { 'headband': 'Headband', 'sleeves': 'Arm Sleeves', 'drip_outfit': 'Drip Outfit' };
                                        
                                        return (
                                            <button 
                                                key={item}
                                                onClick={() => toggleEquip(item)}
                                                className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${isEquipped ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-gray-500'}`}
                                            >
                                                <span className="font-bold text-white uppercase">{displayNames[item] || item}</span>
                                                {isEquipped && <CheckCircle className="text-blue-400" size={20} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="mt-6 text-center text-xs text-gray-500">
                                Equipped items will show in-game.
                            </div>
                        </div>
                    </div>
                )}

                {/* Gym Modal */}
                {showGym && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                        <div className="bg-slate-900 border-2 border-orange-500 rounded-xl p-8 max-w-2xl w-full shadow-2xl relative">
                            <button onClick={() => setShowGym(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                            <div className="text-center mb-8">
                                <h2 className="text-5xl font-[Teko] text-orange-500 uppercase">Training Facility</h2>
                                <p className="text-gray-400">Spend coins to permanently upgrade attributes.</p>
                                <div className="inline-block mt-2 bg-black/40 px-4 py-1 rounded-full border border-yellow-500/30 text-yellow-400 font-mono font-bold">
                                    Balance: {activeSave.coins} Coins
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Shooting */}
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                                    <Activity className="text-green-400 mb-2" size={32} />
                                    <h3 className="text-2xl font-[Teko] text-white">Shooting</h3>
                                    <div className="text-4xl font-bold text-white mb-2">{activeSave.playerData.shooting}</div>
                                    <div className="text-xs text-gray-500 mb-4">Max 99</div>
                                    <button 
                                        onClick={() => upgradeStat('shooting')}
                                        className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-bold uppercase text-sm"
                                    >
                                        Upgrade ({Math.floor(activeSave.playerData.shooting * 5)}c)
                                    </button>
                                </div>
                                
                                {/* Speed */}
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                                    <Zap className="text-yellow-400 mb-2" size={32} />
                                    <h3 className="text-2xl font-[Teko] text-white">Speed</h3>
                                    <div className="text-4xl font-bold text-white mb-2">{activeSave.playerData.speed}</div>
                                    <div className="text-xs text-gray-500 mb-4">Max 99</div>
                                    <button 
                                        onClick={() => upgradeStat('speed')}
                                        className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-bold uppercase text-sm text-black"
                                    >
                                        Upgrade ({Math.floor(activeSave.playerData.speed * 5)}c)
                                    </button>
                                </div>
                                
                                {/* Defense */}
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                                    <Shield className="text-blue-400 mb-2" size={32} />
                                    <h3 className="text-2xl font-[Teko] text-white">Defense</h3>
                                    <div className="text-4xl font-bold text-white mb-2">{activeSave.playerData.defense}</div>
                                    <div className="text-xs text-gray-500 mb-4">Max 99</div>
                                    <button 
                                        onClick={() => upgradeStat('defense')}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold uppercase text-sm"
                                    >
                                        Upgrade ({Math.floor(activeSave.playerData.defense * 5)}c)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* My Crib Modal */}
                {showCrib && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                        <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-8 max-w-3xl w-full shadow-2xl relative">
                             <button onClick={() => setShowCrib(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                             <h2 className="text-4xl font-[Teko] text-cyan-400 uppercase mb-4">My Crib & Lifestyle</h2>
                             
                             <div className="grid grid-cols-2 gap-8">
                                 {/* House Upgrade Section */}
                                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                     <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Home size={20}/> Housing</h3>
                                     <p className="text-sm text-gray-400 mb-4">Current: <span className="text-white font-bold">{life.houseLevel === 0 ? "Homeless" : (life.houseLevel === 1 ? "Studio Apartment" : (life.houseLevel === 2 ? "Luxury Penthouse" : "Mega Mansion"))}</span></p>
                                     <div className="space-y-2">
                                         {life.houseLevel < 1 && <button onClick={() => buyHouse(1, 1000)} className="w-full p-2 bg-slate-700 hover:bg-green-600 rounded text-sm text-left">Buy Apartment (1000c)</button>}
                                         {life.houseLevel < 2 && life.houseLevel >= 1 && <button onClick={() => buyHouse(2, 5000)} className="w-full p-2 bg-slate-700 hover:bg-green-600 rounded text-sm text-left">Buy Penthouse (5000c)</button>}
                                         {life.houseLevel < 3 && life.houseLevel >= 2 && <button onClick={() => buyHouse(3, 20000)} className="w-full p-2 bg-slate-700 hover:bg-green-600 rounded text-sm text-left">Buy Mansion (20000c)</button>}
                                         {life.houseLevel === 3 && <div className="text-yellow-400 font-bold text-center p-2">Maxed Out! King of the City.</div>}
                                     </div>
                                 </div>

                                 {/* Lifestyle Actions */}
                                 <div className="space-y-4">
                                     {/* Hunger */}
                                     <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                         <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pizza size={20}/> Hunger</h3>
                                            <span className={life.foodLevel < 30 ? "text-red-500 font-bold" : "text-green-400"}>{life.foodLevel}%</span>
                                         </div>
                                         <button onClick={() => performLifeAction('eat')} className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded font-bold text-sm">Eat Meal (20c)</button>
                                     </div>

                                     {/* Relationship */}
                                     <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                          <div className="flex justify-between items-center mb-2">
                                              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Heart size={20} className={life.hasWife ? "text-red-500 fill-current" : ""}/> Relationship</h3>
                                              <span className="text-xs text-gray-400">{life.hasWife ? "Married" : "Single"}</span>
                                          </div>
                                          {life.hasWife ? (
                                              <div className="text-sm text-green-400 text-center">Happily Married!</div>
                                          ) : (
                                              <>
                                                 <div className="w-full bg-black h-2 rounded-full overflow-hidden mb-2">
                                                     <div className="h-full bg-pink-500" style={{ width: `${life.relationshipProgress}%` }}></div>
                                                 </div>
                                                 <button onClick={() => performLifeAction('date')} className="w-full py-2 bg-pink-600 hover:bg-pink-500 rounded font-bold text-sm">Go on Date (100c)</button>
                                              </>
                                          )}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* Neighborhood Wager Modal */}
                {showNeighborhood && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                        <div className="bg-slate-900 border-2 border-purple-500 rounded-xl p-8 max-w-lg w-full shadow-2xl relative text-center">
                            <button onClick={() => setShowNeighborhood(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                            <CloudRain size={64} className="mx-auto text-purple-500 mb-4" />
                            <h2 className="text-4xl font-[Teko] text-white uppercase mb-2">Blacktop Wagers</h2>
                            <p className="text-gray-400 mb-6">Play against local High Schoolers for cash. If you lose, your money is gone.</p>
                            
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest">Wager Amount</label>
                                <div className="flex items-center justify-center gap-4">
                                    <input 
                                       type="range" min="10" max="1000" step="10" 
                                       value={wagerInput} onChange={(e) => setWagerInput(Number(e.target.value))}
                                       className="w-full accent-purple-500"
                                    />
                                    <div className="text-2xl font-bold text-yellow-400 font-mono w-24">{wagerInput}c</div>
                                </div>
                            </div>

                            <button 
                                onClick={playWagerMatch}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-[Teko] text-2xl uppercase tracking-widest shadow-[0_0_20px_rgba(147,51,234,0.5)]"
                            >
                                Play Match
                            </button>
                        </div>
                    </div>
                )}

                {/* Trade Modal */}
                {showTradeModal && tradeTarget && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                        <div className="bg-slate-900 border-2 border-slate-600 rounded-xl p-8 max-w-lg w-full shadow-2xl text-center">
                            <h3 className="text-2xl font-[Teko] text-gray-400 uppercase mb-2">Trade Offer Found</h3>
                            <div className="flex items-center justify-center gap-6 my-8">
                                <div className="text-center opacity-50">
                                    <div className="text-4xl font-bold text-gray-500">{team.abbreviation}</div>
                                    <div className="text-xs">Current Team</div>
                                </div>
                                <RefreshCw className="text-white animate-spin-slow" />
                                <div className="text-center">
                                    <div className="text-6xl font-[Teko]" style={{ color: tradeTarget.primaryColor }}>{tradeTarget.abbreviation}</div>
                                    <div className="text-xl font-bold text-white">{tradeTarget.name}</div>
                                </div>
                            </div>
                            <p className="text-gray-300 mb-8 text-sm font-mono">
                                "We've managed to secure a deal with the {tradeTarget.city} {tradeTarget.name}. 
                                They are offering you a starting spot. Do you want to accept this trade?"
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowTradeModal(false)}
                                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded font-bold uppercase text-gray-300"
                                >
                                    Reject
                                </button>
                                <button 
                                    onClick={acceptTrade}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded font-bold uppercase text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]"
                                >
                                    Accept Trade
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Slot Selection Mode
    if (!selectedSlot && !activeSave) {
        return (
            <div className="w-full h-full bg-slate-900 text-white p-8 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-8">
                    <button onClick={onBack} className="text-gray-400 font-bold hover:text-white flex items-center gap-2">
                        <X size={24} /> BACK
                    </button>
                    <h1 className="text-5xl font-[Teko] uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Select Career File</h1>
                    <div className="w-20"></div>
                </div>
                
                <div className="grid grid-cols-4 gap-6 w-full max-w-5xl">
                    {saves.map((save) => (
                        <div 
                            key={save.id} 
                            className="aspect-[3/4] bg-slate-800 border-2 border-slate-600 rounded-xl hover:border-yellow-400 hover:bg-slate-750 transition-all cursor-pointer relative group p-6 flex flex-col items-center justify-center text-center shadow-lg"
                            onClick={() => handleSlotClick(save.id)}
                        >
                            {save.phase === CareerPhase.EMPTY ? (
                                <>
                                    <div className="text-6xl text-gray-600 mb-4 group-hover:text-white transition-colors">+</div>
                                    <span className="text-gray-400 font-mono uppercase group-hover:text-white">New Career</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4 border-2 border-slate-500">
                                        <User size={32} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold font-[Teko] text-white">{save.name}</h3>
                                    <p className="text-sm text-yellow-500 font-bold mb-4">{TEAMS.find(t=>t.id === save.teamId)?.name || 'College'}</p>
                                    
                                    <div className="w-full bg-black/30 p-2 rounded text-xs space-y-1 font-mono text-gray-400">
                                        <div className="flex justify-between"><span>OVR</span> <span className="text-white">{save.playerData.rating}</span></div>
                                        <div className="flex justify-between"><span>COINS</span> <span className="text-yellow-400">{save.coins}</span></div>
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteSave(save.id); }}
                                        className="absolute top-3 right-3 text-gray-600 hover:text-red-500 transition-colors"
                                        title="Delete Save"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    {/* Render remaining empty slots up to 8 */}
                    {Array.from({ length: 8 - saves.length }).map((_, idx) => {
                        const actualId = saves.length + idx + 100; // Offset ID
                        return (
                            <div 
                                key={actualId} 
                                className="aspect-[3/4] bg-slate-800/30 border-2 border-slate-700 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-gray-500 transition-all group"
                                onClick={() => handleSlotClick(actualId)}
                            >
                                <span className="text-gray-600 font-mono uppercase text-xs group-hover:text-gray-400">Empty Slot {idx + 1}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }

    // Creator Mode
    if (selectedSlot) {
        return (
            <div className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center animate-fade-in-up bg-[url('https://images.unsplash.com/photo-1505666287802-9315836d9a3e?q=80&w=2000')] bg-cover bg-center">
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
                 
                 <div className="z-10 w-full max-w-md">
                     <h2 className="text-6xl font-[Teko] mb-2 text-center text-white uppercase tracking-wider">Create Player</h2>
                     <p className="text-center text-gray-400 mb-8 font-mono text-sm">Build your archetype for the draft</p>
                     
                     <div className="bg-slate-900/90 p-8 rounded-2xl border border-slate-600 space-y-6 shadow-2xl">
                         <div>
                             <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">Player Name</label>
                             <input 
                                type="text" 
                                className="w-full bg-black border border-slate-700 p-4 rounded-lg text-white font-bold text-lg focus:border-yellow-500 focus:outline-none transition-colors"
                                placeholder="Enter Name..."
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                             />
                         </div>
                         
                         <div>
                             <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">Jersey Number (0-99)</label>
                             <input 
                                type="number" 
                                min="0" max="99"
                                className="w-full bg-black border border-slate-700 p-4 rounded-lg text-white font-bold text-lg focus:border-yellow-500 focus:outline-none transition-colors"
                                value={formData.number}
                                onChange={(e) => setFormData({...formData, number: Math.max(0, Math.min(99, parseInt(e.target.value) || 0)).toString() })}
                             />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Height</label>
                                 <select 
                                    className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white focus:border-yellow-500 outline-none"
                                    value={formData.height}
                                    onChange={e => setFormData({...formData, height: e.target.value})}
                                 >
                                     {["5'9\"", "6'0\"", "6'3\"", "6'6\"", "6'9\"", "7'0\""].map(h => <option key={h} value={h}>{h}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Weight</label>
                                 <select 
                                    className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white focus:border-yellow-500 outline-none"
                                    value={formData.weight}
                                    onChange={e => setFormData({...formData, weight: e.target.value})}
                                 >
                                     {["175 lbs", "185 lbs", "195 lbs", "215 lbs", "240 lbs", "260 lbs"].map(w => <option key={w} value={w}>{w}</option>)}
                                 </select>
                             </div>
                         </div>
                         
                         <div>
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Position</label>
                             <div className="grid grid-cols-5 gap-2">
                                 {Object.values(Position).map(p => (
                                     <button 
                                        key={p}
                                        onClick={() => setFormData({...formData, position: p})}
                                        className={`py-2 rounded font-bold text-sm transition-all ${formData.position === p ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-slate-800 text-gray-500 hover:bg-slate-700 hover:text-white'}`}
                                     >
                                         {p}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         <div className="pt-4 flex gap-4">
                             <button onClick={() => setSelectedSlot(null)} className="flex-1 py-4 text-gray-500 font-bold uppercase hover:text-white transition-colors">Cancel</button>
                             <button 
                                onClick={createPlayer}
                                className="flex-[2] bg-white hover:bg-gray-200 text-black py-4 rounded-lg font-[Teko] text-2xl uppercase tracking-widest shadow-lg transform hover:-translate-y-1 transition-all"
                             >
                                 Start Career
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        );
    }

    // Intermediate States (Rookie Skills Challenge)
    if (activeSave && activeSave.phase === CareerPhase.SKILLS_CHALLENGE) {
        return (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?q=80&w=2070')] bg-cover bg-center">
                 <div className="absolute inset-0 bg-black/80"></div>
                 <div className="relative text-center max-w-2xl p-12 bg-slate-900/90 border-2 border-blue-500 rounded-2xl shadow-2xl animate-fade-in-up">
                     <h1 className="text-6xl font-[Teko] text-blue-500 mb-4 uppercase tracking-widest">Rookie Skills Challenge</h1>
                     <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mb-6"></div>
                     <p className="text-xl text-gray-300 mb-8 font-mono leading-relaxed">
                         "You've been drafted, but respect is earned. Show the coaching staff what you can do in the skills combine. 
                         Your performance here decides your starting spot in the rotation."
                     </p>
                     <button 
                        onClick={advancePhase}
                        className="bg-white text-black px-12 py-4 font-[Teko] text-3xl font-bold uppercase rounded hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_30px_rgba(0,0,255,0.4)]"
                     >
                         Play Rookie Showcase
                     </button>
                 </div>
            </div>
        );
    }

    // Fallback for safety
    return (
        <div className="w-full h-full bg-black flex items-center justify-center text-white">
            Loading Career Phase...
            <button onClick={() => setActiveSave(null)} className="block mt-4 text-red-500 underline">Return to Menu</button>
        </div>
    );
};
