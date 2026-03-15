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
          current_sub_level: '1.1',
          highest_digits: 2,
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
          <h1>数字の逆さま記憶ゲーム</h1>
          <p>ワーキングメモリートレーニング</p>
          <button onClick={() => {
            dispatch(startGameSession());
            startNextTrial();
          }}>
            トレーニングを開始する
          </button>
        </div>
      )}
      
      {isGameActive && <GameCanvas />}

      {phase === 'result' && <ResultScreen />}
    </div>
  );
}

export default App;
