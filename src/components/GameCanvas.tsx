import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { transitionToRecall, registerError } from '../store/slices/gameSlice';
import { useGameLogic } from '../hooks/useGameLogic';
import { speakNumber } from '../utils/audio';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { finishTrial, startNextTrial } = useGameLogic();
  
  const game = useSelector((state: RootState) => state.game);
  const user = useSelector((state: RootState) => state.user);
  
  // Ref to access latest state inside PixiJS async callbacks without causing re-renders
  const stateRef = useRef(game);
  stateRef.current = game;

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    let isDestroyed = false;

    const init = async () => {
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x242424,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isDestroyed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      if (canvasRef.current) {
        canvasRef.current.appendChild(app.canvas as unknown as Node);
      }
      pixiApp.current = app;

      const sceneContainer = new PIXI.Container();
      app.stage.addChild(sceneContainer);
      
      const renderMemorizePhase = async () => {
        sceneContainer.removeChildren();
        const { sequence, displaySpeedMs } = stateRef.current;
        
        // 3x3 grid positions
        const positions = [
          {x: 200, y: 150}, {x: 400, y: 150}, {x: 600, y: 150},
          {x: 200, y: 300}, {x: 400, y: 300}, {x: 600, y: 300},
          {x: 200, y: 450}, {x: 400, y: 450}, {x: 600, y: 450},
        ];
        
        const shuffledPos = [...positions].sort(() => Math.random() - 0.5);

        // Pre-start delay
        await new Promise(res => setTimeout(res, 500));

        // Create progress dots container at the bottom
        const dotsContainer = new PIXI.Container();
        dotsContainer.y = 550;
        sceneContainer.addChild(dotsContainer);
        
        const dotSize = 10;
        const dotSpacing = 15;
        const totalDotsWidth = sequence.length * dotSize + (sequence.length - 1) * dotSpacing;
        const startDotX = 400 - totalDotsWidth / 2 + dotSize / 2;

        const dots: PIXI.Graphics[] = [];
        for (let i = 0; i < sequence.length; i++) {
          const dot = new PIXI.Graphics();
          dot.circle(0, 0, dotSize / 2).fill(0x555555);
          dot.x = startDotX + i * (dotSize + dotSpacing);
          dotsContainer.addChild(dot);
          dots.push(dot);
        }

        let isPhaseActive = true;

        for (let i = 0; i < sequence.length; i++) {
          if (isDestroyed || stateRef.current.phase !== 'memorize') {
            isPhaseActive = false;
            break;
          }
          
          // Update progress dot
          dots[i].clear().circle(0, 0, dotSize / 2).fill(0x4facfe);
          
          const num = sequence[i];
          const pos = shuffledPos[i % shuffledPos.length];
          
          const text = new PIXI.Text({
            text: num.toString(),
            style: { fontFamily: 'Arial', fontSize: 120, fill: 0xffffff, fontWeight: 'bold' }
          });
          text.anchor.set(0.5);
          text.x = pos.x;
          text.y = pos.y;
          
          sceneContainer.addChild(text);
          
          if (user.profile?.settings.voice_assist) {
            speakNumber(num);
          }

          // Display duration
          await new Promise(res => setTimeout(res, displaySpeedMs));
          
          if (isDestroyed) {
             isPhaseActive = false;
             break;
          }
          sceneContainer.removeChild(text);
          text.destroy();
          
          // Gap between numbers
          await new Promise(res => setTimeout(res, 300));
        }

        if (isPhaseActive && !isDestroyed && stateRef.current.phase === 'memorize') {
          dispatch(transitionToRecall());
        }
      };

      const renderRecallPhase = () => {
        sceneContainer.removeChildren();
        const { sequence, dummyCards } = stateRef.current;
        
        const infoText = new PIXI.Text({
          text: '逆の順番で枠に入れてね',
          style: { fontFamily: 'Arial', fontSize: 24, fill: 0xaaaaaa }
        });
        infoText.x = 400; infoText.y = 50;
        infoText.anchor.set(0.5);
        sceneContainer.addChild(infoText);

        const expectedAnswers = [...sequence].reverse();
        const allCards = [...sequence];
        
        for (let i = 0; i < dummyCards; i++) {
           let dummy;
           do {
             dummy = Math.floor(Math.random() * 9) + 1;
           } while (allCards.includes(dummy));
           allCards.push(dummy);
        }
        
        allCards.sort(() => Math.random() - 0.5);

        const slotSize = 80;
        const spacing = 20;
        const totalWidth = expectedAnswers.length * slotSize + (expectedAnswers.length - 1) * spacing;
        const startX = 400 - totalWidth / 2 + slotSize / 2;

        const slots: { sprite: PIXI.Graphics, expected: number, filled: boolean, x: number, y: number }[] = [];
        
        for (let i = 0; i < expectedAnswers.length; i++) {
          const slot = new PIXI.Graphics();
          slot.roundRect(-slotSize/2, -slotSize/2, slotSize, slotSize, 10).stroke({width: 4, color: 0x555555});
          slot.x = startX + i * (slotSize + spacing);
          slot.y = 200;
          sceneContainer.addChild(slot);
          
          slots.push({ sprite: slot, expected: expectedAnswers[i], filled: false, x: slot.x, y: slot.y });
        }

        const cardSize = 80;
        const cardsTotalWidth = allCards.length * cardSize + (allCards.length - 1) * spacing;
        const cardsStartX = 400 - cardsTotalWidth / 2 + cardSize / 2;
        
        let filledCount = 0;

        for (let i = 0; i < allCards.length; i++) {
          const num = allCards[i];
          const initialX = cardsStartX + i * (cardSize + spacing);
          const initialY = 400;

          const card = new PIXI.Container();
          card.x = initialX;
          card.y = initialY;
          
          const bg = new PIXI.Graphics();
          bg.roundRect(-cardSize/2, -cardSize/2, cardSize, cardSize, 10).fill(0x4facfe);
          card.addChild(bg);
          
          const text = new PIXI.Text({
            text: num.toString(),
            style: { fontFamily: 'Arial', fontSize: 40, fill: 0xffffff, fontWeight: 'bold' }
          });
          text.anchor.set(0.5);
          card.addChild(text);

          card.eventMode = 'static';
          card.cursor = 'pointer';

          let dragging = false;
          let dragStartPoint = { x: 0, y: 0 };
          let cardStartPoint = { x: 0, y: 0 };

          card.on('pointerdown', (e) => {
            dragging = true;
            dragStartPoint = { x: e.global.x, y: e.global.y };
            cardStartPoint = { x: card.x, y: card.y };
            card.zIndex = 100;
            sceneContainer.sortChildren();
          });

          card.on('pointerup', () => {
             if (!dragging) return;
             dragging = false;
             
             const nextSlot = slots.find(s => !s.filled);
             if (nextSlot) {
               const dx = card.x - nextSlot.x;
               const dy = card.y - nextSlot.y;
               const dist = Math.sqrt(dx*dx + dy*dy);
               
               if (dist < 60) {
                 if (num === nextSlot.expected) {
                   card.x = nextSlot.x;
                   card.y = nextSlot.y;
                   card.eventMode = 'none';
                   nextSlot.filled = true;
                   filledCount++;
                   
                   if (filledCount === expectedAnswers.length) {
                     const actualTimeSec = (Date.now() - (stateRef.current.startTime || Date.now())) / 1000;
                     setTimeout(() => finishTrial(actualTimeSec), 500);
                   }
                   return;
                 } else {
                   dispatch(registerError());
                   let shakeCount = 0;
                   const ticker = new PIXI.Ticker();
                   ticker.add(() => {
                     shakeCount++;
                     card.x = nextSlot.x + Math.sin(shakeCount * 0.8) * 15;
                     if (shakeCount > 20) {
                       ticker.destroy();
                       card.x = initialX;
                       card.y = initialY;
                     }
                   });
                   ticker.start();
                   return;
                 }
               }
             }
             
             card.x = initialX;
             card.y = initialY;
          });
          
          card.on('pointerupoutside', (e) => card.emit('pointerup', e));

          card.on('pointermove', (e) => {
            if (dragging) {
               card.x = cardStartPoint.x + (e.global.x - dragStartPoint.x);
               card.y = cardStartPoint.y + (e.global.y - dragStartPoint.y);
            }
          });

          sceneContainer.addChild(card);
        }
        
        sceneContainer.sortableChildren = true;
      };

      let lastPhase = stateRef.current.phase;

      app.ticker.add(() => {
        const currentPhase = stateRef.current.phase;
        
        // Handle initial start from idle -> idle but with intention to start
        // Actually, if we use a new state property like isPlaying it would be cleaner.
        // For now, let's trigger startNextTrial if phase is 'idle' and we want to start.
        
        if (currentPhase !== lastPhase) {
          lastPhase = currentPhase;
          if (currentPhase === 'memorize') {
            renderMemorizePhase();
          } else if (currentPhase === 'recall') {
            renderRecallPhase();
          } else if (currentPhase === 'idle') {
            sceneContainer.removeChildren();
            if (stateRef.current.currentTrial > 0 && stateRef.current.currentTrial < stateRef.current.maxTrials) {
               setTimeout(() => startNextTrial(), 1000);
            }
          }
        }
      });
      
      if (lastPhase === 'memorize') {
        renderMemorizePhase();
      } else if (lastPhase === 'idle' && stateRef.current.currentTrial > 0) {
        startNextTrial();
      }

      // Allow triggering startNextTrial externally by listening to a custom event or Redux action
      // To simplify, let's export startNextTrial or have App.tsx call it via useGameLogic.

    };

    init();

    return () => {
      isDestroyed = true;
      if (pixiApp.current) {
        pixiApp.current.destroy(true, { children: true, texture: true });
        pixiApp.current = null;
      }
    };
  }, [dispatch, finishTrial, startNextTrial, user.profile?.settings.voice_assist]);

  return <div ref={canvasRef} className="game-canvas" />;
};

export default GameCanvas;
