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
  
  // Refs to access latest state and functions inside PixiJS without causing useEffect re-runs
  const stateRef = useRef(game);
  stateRef.current = game;
  const userRef = useRef(user);
  userRef.current = user;

  const finishTrialRef = useRef(finishTrial);
  finishTrialRef.current = finishTrial;
  const startNextTrialRef = useRef(startNextTrial);
  startNextTrialRef.current = startNextTrial;

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    let isDestroyed = false;

    const init = async () => {
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x0f172a, // Match CSS bg-dark
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      });

      if (isDestroyed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      if (canvasRef.current) {
        canvasRef.current.appendChild(app.canvas as unknown as Node);
        // CRITICAL: Prevent browser from interpreting touch-move as scroll/pan
        // which would fire pointercancel and kill the drag.
        // PixiJS's EventSystem does NOT call preventDefault on pointermove,
        // and passive listeners (the browser default) ignore preventDefault.
        const canvasEl = app.canvas as unknown as HTMLCanvasElement;
        canvasEl.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
        canvasEl.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
      }
      pixiApp.current = app;

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      const sceneContainer = new PIXI.Container();
      app.stage.addChild(sceneContainer);
      
      const renderMemorizePhase = async () => {
        sceneContainer.removeChildren();
        const { sequence, displaySpeedMs } = stateRef.current;
        const spatialMappingEnabled = userRef.current.profile?.settings.spatial_mapping;
        
        const gridPositions: Record<number, {x: number, y: number}> = {
          1: {x: 200, y: 150}, 2: {x: 400, y: 150}, 3: {x: 600, y: 150},
          4: {x: 200, y: 300}, 5: {x: 400, y: 300}, 6: {x: 600, y: 300},
          7: {x: 200, y: 450}, 8: {x: 400, y: 450}, 9: {x: 600, y: 450},
        };
        const centerPos = {x: 400, y: 300};

        await new Promise(res => setTimeout(res, 500));

        const dotsContainer = new PIXI.Container();
        dotsContainer.y = 550;
        sceneContainer.addChild(dotsContainer);
        
        const dotSize = 8;
        const dotSpacing = 16;
        const totalDotsWidth = sequence.length * dotSize + (sequence.length - 1) * dotSpacing;
        const startDotX = 400 - totalDotsWidth / 2 + dotSize / 2;

        const dots: PIXI.Graphics[] = [];
        for (let i = 0; i < sequence.length; i++) {
          const dot = new PIXI.Graphics();
          dot.circle(0, 0, dotSize / 2).fill({ color: 0xffffff, alpha: 0.1 });
          dot.x = startDotX + i * (dotSize + dotSpacing);
          dotsContainer.addChild(dot);
          dots.push(dot);
        }

        for (let i = 0; i < sequence.length; i++) {
          if (isDestroyed || stateRef.current.phase !== 'memorize') return;
          
          if (dots[i]) {
            dots[i].clear().circle(0, 0, dotSize / 2).fill(0x4facfe);
            // Add a small glow to the active dot
            const glow = new PIXI.Graphics().circle(0, 0, dotSize).fill({ color: 0x4facfe, alpha: 0.3 });
            dots[i].addChild(glow);
          }
          
          const num = sequence[i];
          const pos = spatialMappingEnabled ? (gridPositions[num] || centerPos) : centerPos;
          
          const text = new PIXI.Text({
            text: num.toString(),
            style: { 
              fontFamily: 'Inter, Arial', 
              fontSize: spatialMappingEnabled ? 130 : 200, 
              fill: 0xffffff, 
              fontWeight: '900',
              dropShadow: {
                alpha: 0.5,
                angle: Math.PI / 6,
                blur: 20,
                color: 0x4facfe,
                distance: 0,
              }
            }
          });
          text.anchor.set(0.5);
          text.x = pos.x; text.y = pos.y;
          sceneContainer.addChild(text);
          
          if (userRef.current.profile?.settings.voice_assist) {
            speakNumber(num);
          }

          await new Promise(res => setTimeout(res, displaySpeedMs));
          
          if (isDestroyed || stateRef.current.phase !== 'memorize') {
             if (text && !text.destroyed) { sceneContainer.removeChild(text); text.destroy(); }
             return;
          }
          sceneContainer.removeChild(text);
          text.destroy();
          await new Promise(res => setTimeout(res, 300));
        }

        if (!isDestroyed && stateRef.current.phase === 'memorize') {
          dispatch(transitionToRecall());
        }
      };

      const renderRecallPhase = () => {
        sceneContainer.removeChildren();
        const { sequence, dummyCards, taskMode } = stateRef.current;
        
        let instructionText = '';
        let expectedAnswers: number[] = [];

        if (taskMode === 'forward') {
          instructionText = 'そのままの順番で入れてね';
          expectedAnswers = [...sequence];
        } else if (taskMode === 'backward') {
          instructionText = '逆の順番で入れてね';
          expectedAnswers = [...sequence].reverse();
        } else if (taskMode === 'sequencing') {
          instructionText = '小さい順に入れてね';
          expectedAnswers = [...sequence].sort((a, b) => a - b);
        }

        const infoText = new PIXI.Text({
          text: instructionText,
          style: { fontFamily: 'Inter, Arial', fontSize: 28, fill: 0x94a3b8, fontWeight: '600' }
        });
        infoText.x = 400; infoText.y = 60;
        infoText.anchor.set(0.5);
        sceneContainer.addChild(infoText);

        const allCards = [...sequence];
        for (let i = 0; i < dummyCards; i++) {
           let dummy;
           do { dummy = Math.floor(Math.random() * 9) + 1; } while (allCards.includes(dummy));
           allCards.push(dummy);
        }
        allCards.sort(() => Math.random() - 0.5);

        const slotSize = 84;
        const spacing = 24;
        const totalWidth = expectedAnswers.length * slotSize + (expectedAnswers.length - 1) * spacing;
        const startX = 400 - totalWidth / 2 + slotSize / 2;

        interface Slot {
          expected: number;
          filled: boolean;
          x: number;
          y: number;
        }
        const slots: Slot[] = [];
        for (let i = 0; i < expectedAnswers.length; i++) {
          const slot = new PIXI.Graphics();
          // Modern slot design: subtle fill and border
          slot.roundRect(-slotSize/2, -slotSize/2, slotSize, slotSize, 16)
              .fill({ color: 0xffffff, alpha: 0.05 })
              .stroke({ width: 2, color: 0xffffff, alpha: 0.1 });
          slot.x = startX + i * (slotSize + spacing);
          slot.y = 200;
          sceneContainer.addChild(slot);
          slots.push({ expected: expectedAnswers[i], filled: false, x: slot.x, y: slot.y });
        }

        const cardSize = 84;
        const cardsTotalWidth = allCards.length * cardSize + (allCards.length - 1) * spacing;
        const cardsStartX = 400 - cardsTotalWidth / 2 + cardSize / 2;
        let filledCount = 0;

        for (let i = 0; i < allCards.length; i++) {
          const num = allCards[i];
          const initialX = cardsStartX + i * (cardSize + spacing);
          const initialY = 420;

          const card = new PIXI.Container();
          card.x = initialX; card.y = initialY;
          
          const bg = new PIXI.Graphics();
          // Modern card: Gradient-like fill (using multiple fills) and nice border
          bg.roundRect(-cardSize/2, -cardSize/2, cardSize, cardSize, 16)
            .fill(0x1e293b) // Card base
            .fill({ color: 0x4facfe, alpha: 0.1 }) // Subtle tint
            .stroke({ width: 2, color: 0x4facfe, alpha: 0.5 });
          
          card.addChild(bg);
          
          const text = new PIXI.Text({
            text: num.toString(),
            style: { fontFamily: 'Inter, Arial', fontSize: 44, fill: 0xffffff, fontWeight: '800' }
          });
          text.anchor.set(0.5);
          card.addChild(text);

          card.eventMode = 'static';
          card.cursor = 'pointer';

          let dragging = false;
          let dragStartPoint = { x: 0, y: 0 };
          let cardStartPoint = { x: 0, y: 0 };
          let draggingPointerId: number | null = null;

          const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (dragging && e.pointerId === draggingPointerId) {
               card.x = cardStartPoint.x + (e.global.x - dragStartPoint.x);
               card.y = cardStartPoint.y + (e.global.y - dragStartPoint.y);
            }
          };

          const onDragEnd = (e: PIXI.FederatedPointerEvent) => {
             if (!dragging || e.pointerId !== draggingPointerId) return;
             dragging = false;
             draggingPointerId = null;
             
             app.stage.off('globalpointermove', onDragMove);
             app.stage.off('pointerup', onDragEnd);
             app.stage.off('pointerupoutside', onDragEnd);
             app.stage.off('pointercancel', onDragEnd);

             const nextSlot = slots.find(s => !s.filled);
             if (nextSlot) {
               const dx = card.x - nextSlot.x;
               const dy = card.y - nextSlot.y;
               if (Math.sqrt(dx*dx + dy*dy) < 60) {
                 if (num === nextSlot.expected) {
                   card.x = nextSlot.x; card.y = nextSlot.y;
                   card.eventMode = 'none';
                   nextSlot.filled = true;
                   filledCount++;
                   if (filledCount === expectedAnswers.length) {
                     const actualTimeSec = (Date.now() - (stateRef.current.startTime || Date.now())) / 1000;
                     setTimeout(() => finishTrialRef.current(actualTimeSec), 500);
                   }
                   return;
                 } else {
                   dispatch(registerError());
                   let shakeCount = 0;
                   card.eventMode = 'none';
                   const ticker = new PIXI.Ticker();
                   ticker.add(() => {
                     shakeCount++;
                     card.x = nextSlot.x + Math.sin(shakeCount * 0.8) * 15;
                     if (shakeCount > 20) { 
                       ticker.destroy(); 
                       card.x = initialX; card.y = initialY; 
                       card.eventMode = 'static';
                     }
                   });
                   ticker.start();
                   return;
                 }
               }
             }
             card.x = initialX; card.y = initialY;
          };

          card.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
            if (dragging) return;
            
            dragging = true;
            draggingPointerId = e.pointerId;
            dragStartPoint = { x: e.global.x, y: e.global.y };
            cardStartPoint = { x: card.x, y: card.y };
            card.zIndex = 100;
            sceneContainer.sortChildren();
            
            app.stage.on('globalpointermove', onDragMove);
            app.stage.on('pointerup', onDragEnd);
            app.stage.on('pointerupoutside', onDragEnd);
            app.stage.on('pointercancel', onDragEnd);
          });

          sceneContainer.addChild(card);
        }
        sceneContainer.sortableChildren = true;
      };

      let lastPhase = stateRef.current.phase;
      
      app.ticker.add(() => {
        const currentPhase = stateRef.current.phase;
        if (currentPhase !== lastPhase) {
          lastPhase = currentPhase;
          if (currentPhase === 'memorize') renderMemorizePhase();
          else if (currentPhase === 'recall') renderRecallPhase();
          else if (currentPhase === 'idle') {
            sceneContainer.removeChildren();
            if (stateRef.current.currentTrial > 0 && stateRef.current.currentTrial < stateRef.current.maxTrials) {
               setTimeout(() => startNextTrialRef.current(), 1000);
            }
          }
        }
      });
      
      // Handle initial phase on mount
      if (lastPhase === 'memorize') renderMemorizePhase();
      if (lastPhase === 'recall') renderRecallPhase();
    };

    init();

    return () => {
      isDestroyed = true;
      if (pixiApp.current) {
        pixiApp.current.destroy(true, { children: true, texture: true });
        pixiApp.current = null;
      }
    };
  }, [dispatch]); // Stable dependencies to prevent re-initializing Pixi app

  return <div ref={canvasRef} className="game-canvas" style={{ touchAction: 'none' }} />;
};

export default GameCanvas;
