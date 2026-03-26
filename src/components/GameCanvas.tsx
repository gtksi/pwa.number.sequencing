import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { transitionToRecall } from '../store/slices/gameSlice';
import { speakNumber } from '../utils/audio';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  
  const game = useSelector((state: RootState) => state.game);
  const user = useSelector((state: RootState) => state.user);
  
  // Refs to access latest state and functions inside PixiJS without causing useEffect re-runs
  const stateRef = useRef(game);
  stateRef.current = game;
  const userRef = useRef(user);
  userRef.current = user;

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
      }
      pixiApp.current = app;

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

      let lastPhase = stateRef.current.phase;
      
      app.ticker.add(() => {
        const currentPhase = stateRef.current.phase;
        if (currentPhase !== lastPhase) {
          lastPhase = currentPhase;
          if (currentPhase === 'memorize') renderMemorizePhase();
        }
      });
      
      // Handle initial phase on mount
      if (lastPhase === 'memorize') renderMemorizePhase();
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
