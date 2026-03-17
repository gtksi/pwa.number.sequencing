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

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      const sceneContainer = new PIXI.Container();
      app.stage.addChild(sceneContainer);
      
      const renderMemorizePhase = async () => {
        sceneContainer.removeChildren();
        const { sequence, displaySpeedMs } = stateRef.current;
        
        const positions = [
          {x: 200, y: 150}, {x: 400, y: 150}, {x: 600, y: 150},
          {x: 200, y: 300}, {x: 400, y: 300}, {x: 600, y: 300},
          {x: 200, y: 450}, {x: 400, y: 450}, {x: 600, y: 450},
        ];
        const shuffledPos = [...positions].sort(() => Math.random() - 0.5);

        await new Promise(res => setTimeout(res, 500));

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

        for (let i = 0; i < sequence.length; i++) {
          if (isDestroyed || stateRef.current.phase !== 'memorize') return;
          
          if (dots[i]) {
            dots[i].clear().circle(0, 0, dotSize / 2).fill(0x4facfe);
          }
          
          const num = sequence[i];
          const pos = shuffledPos[i % shuffledPos.length];
          const text = new PIXI.Text({
            text: num.toString(),
            style: { fontFamily: 'Arial', fontSize: 120, fill: 0xffffff, fontWeight: 'bold' }
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
          instructionText = '元の順番で枠に入れてね';
          expectedAnswers = [...sequence];
        } else if (taskMode === 'backward') {
          instructionText = '逆の順番で枠に入れてね';
          expectedAnswers = [...sequence].reverse();
        } else if (taskMode === 'sequencing') {
          instructionText = '小さい順に枠に入れてね';
          expectedAnswers = [...sequence].sort((a, b) => a - b);
        }

        const infoText = new PIXI.Text({
          text: instructionText,
          style: { fontFamily: 'Arial', fontSize: 24, fill: 0xaaaaaa }
        });
        infoText.x = 400; infoText.y = 50;
        infoText.anchor.set(0.5);
        sceneContainer.addChild(infoText);

        const allCards = [...sequence];
        for (let i = 0; i < dummyCards; i++) {
           let dummy;
           do { dummy = Math.floor(Math.random() * 9) + 1; } while (allCards.includes(dummy));
           allCards.push(dummy);
        }
        allCards.sort(() => Math.random() - 0.5);

        const slotSize = 80;
        const spacing = 20;
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
          slot.roundRect(-slotSize/2, -slotSize/2, slotSize, slotSize, 10).stroke({width: 4, color: 0x555555});
          slot.x = startX + i * (slotSize + spacing);
          slot.y = 200;
          sceneContainer.addChild(slot);
          slots.push({ expected: expectedAnswers[i], filled: false, x: slot.x, y: slot.y });
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
          card.x = initialX; card.y = initialY;
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

          const onDragMove = (e: PIXI.FederatedPointerEvent) => {
            if (dragging) {
               card.x = cardStartPoint.x + (e.global.x - dragStartPoint.x);
               card.y = cardStartPoint.y + (e.global.y - dragStartPoint.y);
            }
          };

          const onDragEnd = () => {
             if (!dragging) return;
             dragging = false;
             app.stage.off('pointermove', onDragMove);
             app.stage.off('pointerup', onDragEnd);
             app.stage.off('pointerupoutside', onDragEnd);

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
                   const ticker = new PIXI.Ticker();
                   ticker.add(() => {
                     shakeCount++;
                     card.x = nextSlot.x + Math.sin(shakeCount * 0.8) * 15;
                     if (shakeCount > 20) { ticker.destroy(); card.x = initialX; card.y = initialY; }
                   });
                   ticker.start();
                   return;
                 }
               }
             }
             card.x = initialX; card.y = initialY;
          };

          card.on('pointerdown', (e) => {
            dragging = true;
            dragStartPoint = { x: e.global.x, y: e.global.y };
            cardStartPoint = { x: card.x, y: card.y };
            card.zIndex = 100;
            sceneContainer.sortChildren();
            
            app.stage.on('pointermove', onDragMove);
            app.stage.on('pointerup', onDragEnd);
            app.stage.on('pointerupoutside', onDragEnd);
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

  return <div ref={canvasRef} className="game-canvas" />;
};

export default GameCanvas;
