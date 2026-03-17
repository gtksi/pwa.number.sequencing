import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { db } from './db/db';
import { setUserProfile } from './store/slices/userSlice';
import { startGameSession } from './store/slices/gameSlice';
import GameCanvas from './components/GameCanvas';
import ResultScreen from './components/ResultScreen';
import { useGameLogic } from './hooks/useGameLogic';
import './App.css';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.user);
  const { phase, currentTrial } = useSelector((state: RootState) => state.game);
  const { startNextTrial } = useGameLogic();

  useEffect(() => {
    const initializeUser = async () => {
      let user = await db.userProfile.get('user');
      if (!user) {
        user = {
          id: 'user',
          age_months: 120, // default ~10 years old
          stats: {
            forward: { current_sub_level: '1.1', highest_digits: 2 },
            backward: { current_sub_level: '1.1', highest_digits: 2 },
            sequencing: { current_sub_level: '1.1', highest_digits: 2 },
          },
          current_percentile: 50,
          total_wm_score: 0,
          settings: {
            voice_assist: true,
            spatial_mapping: true
          }
        };
        await db.userProfile.put(user);
      }
      dispatch(setUserProfile(user));
    };

    initializeUser();
  }, [dispatch]);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  const isGameActive = phase === 'memorize' || phase === 'recall' || (phase === 'idle' && currentTrial > 0);

  return (
    <div className="app-container">
      {phase === 'idle' && currentTrial === 0 && (
        <div className="start-screen">
          <h1>数字の記憶と操作ゲーム</h1>
          <p>ワーキングメモリートレーニング</p>
          <div className="mode-selection" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => {
              dispatch(startGameSession({ taskMode: 'forward' }));
              startNextTrial('forward');
            }}>
              順唱 (Forward)
            </button>
            <button onClick={() => {
              dispatch(startGameSession({ taskMode: 'backward' }));
              startNextTrial('backward');
            }}>
              逆唱 (Backward)
            </button>
            <button onClick={() => {
              dispatch(startGameSession({ taskMode: 'sequencing' }));
              startNextTrial('sequencing');
            }}>
              配列 (Sequencing)
            </button>
          </div>
        </div>
      )}
      
      {isGameActive && <GameCanvas />}

      {phase === 'result' && <ResultScreen />}
    </div>
  );
}

export default App;
