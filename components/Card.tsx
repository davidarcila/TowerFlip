
import React from 'react';
import { CardData, CardEffect, CardTheme } from '../types';
import { EFFECT_CONFIG } from '../constants';
import { Sword, Shield, Heart, Coins, Sparkles, Droplets, Zap } from 'lucide-react';

interface CardProps {
  card: CardData;
  onClick: (card: CardData) => void;
  disabled: boolean;
  theme: CardTheme;
  combo: number;
  index: number;
  isExitAnimating: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, disabled, theme, combo, index, isExitAnimating }) => {
  const config = EFFECT_CONFIG[card.effect];

  const renderIcon = () => {
    if (card.isWildcard) {
       return <Zap className="w-8 h-8 md:w-10 md:h-10 text-white animate-pulse" />;
    }

    switch (card.effect) {
      case CardEffect.ATTACK_SMALL:
      case CardEffect.ATTACK_MEDIUM:
      case CardEffect.ATTACK_BIG:
        return <Sword className={card.effect === CardEffect.ATTACK_BIG ? "w-8 h-8 md:w-10 md:h-10" : "w-6 h-6 md:w-8 md:h-8"} />;
      case CardEffect.HEAL_SMALL:
      case CardEffect.HEAL_MEDIUM:
        return <Heart className="w-6 h-6 md:w-8 md:h-8" />;
      case CardEffect.SHIELD:
        return <Shield className="w-6 h-6 md:w-8 md:h-8" />;
      case CardEffect.COIN_SMALL:
      case CardEffect.COIN_MEDIUM:
        return <Coins className="w-6 h-6 md:w-8 md:h-8" />;
      default:
        return <Sparkles className="w-6 h-6 md:w-8 md:h-8" />;
    }
  };

  // Stagger calculation based on index (row-major order approximate)
  const animDelay = `${index * 0.05}s`;
  const isSlimed = card.isSlimed && !card.isMatched;

  return (
    <div 
      className={`relative w-full aspect-[3/4] cursor-pointer perspective-1000 
                  ${card.isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'} 
                  ${!card.isFlipped && !card.isMatched && !disabled && !isSlimed ? 'hover:scale-105 hover:shadow-2xl active:scale-95' : ''} 
                  ${card.isFlipped && !card.isMatched ? 'animate-pop' : ''}
                  ${isExitAnimating ? 'animate-shuffle-out' : 'animate-deal'}
      `}
      style={{ animationDelay: isExitAnimating ? '0s' : animDelay }}
      onClick={() => !disabled && !card.isFlipped && !card.isMatched && !isSlimed && onClick(card)}
    >
      <div 
        className={`w-full h-full relative transform-style-3d transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${card.isFlipped ? 'rotate-y-180' : ''} shadow-xl rounded-xl`}
      >
        {/* Back of Card (Face Down) - Themed */}
        <div className={`absolute w-full h-full backface-hidden border-2 rounded-xl flex items-center justify-center group ${theme.bgClass} ${combo > 0 && !card.isFlipped ? 'combo-active' : ''} overflow-hidden`}>
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-colors flex items-center justify-center ${theme.decorClass} group-hover:opacity-80`}>
             <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-white/20"></div>
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          {/* Combo Indicator on Card Back */}
          {combo > 0 && (
             <div className="absolute -top-2 -right-2 w-4 h-4 md:w-5 md:h-5 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce shadow-lg border border-white/20">
               <span className="text-[8px] md:text-[10px] text-black font-bold">x{1 + combo * 0.5}</span>
             </div>
          )}

          {/* Slime Overlay on Back */}
          {isSlimed && (
            <div className="absolute inset-0 bg-lime-900/80 flex flex-col items-center justify-center animate-pulse z-20">
                <Droplets className="w-8 h-8 text-lime-400 mb-1" />
                <span className="text-[10px] font-bold text-lime-200 uppercase tracking-wider">Slimed</span>
            </div>
          )}

          {/* Wildcard Overlay on Back (Subtle hint) */}
          {card.isWildcard && (
             <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-transparent to-pink-500/20 border-2 border-transparent"></div>
          )}
        </div>

        {/* Front of Card (Face Up) */}
        <div className={`absolute w-full h-full backface-hidden rotate-y-180 
            ${card.isWildcard 
                ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border-pink-400' 
                : 'bg-slate-800 border-indigo-500'} 
            border-2 rounded-xl flex flex-col items-center justify-center p-1 md:p-2 text-center shadow-[0_0_15px_rgba(99,102,241,0.3)] ${config.color}`}>
          
          {/* Flip visual flare */}
          {card.isFlipped && !card.isMatched && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-full h-full rounded-xl bg-white/10 animate-flip-flare absolute inset-0 border border-white/40"></div>
               <div className="w-full h-full absolute rounded-xl border-2 border-indigo-400 opacity-0 animate-shockwave"></div>
            </div>
          )}
          
          <div className="mb-1 md:mb-2 relative z-10">
            {renderIcon()}
          </div>
          
          {card.isWildcard ? (
              <>
               <span className="text-sm md:text-base font-bold uppercase tracking-wider relative z-10 text-white animate-pulse">WILDCARD</span>
               <span className="text-[10px] font-mono text-pink-200 mt-1">Matches Any</span>
              </>
          ) : (
              <>
                <span className="text-sm md:text-base font-bold uppercase tracking-wider relative z-10 hidden sm:block">{config.label}</span>
                <span className="text-xs md:text-sm font-bold opacity-90 mt-1 font-mono relative z-10">
                    {card.effect.includes('ATTACK') ? `DMG ${config.value}` : 
                    card.effect.includes('HEAL') ? `HP +${config.value}` :
                    card.effect.includes('SHIELD') ? `ARMOR +${config.value}` :
                    `+${config.value}`}
                </span>
              </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Card;
