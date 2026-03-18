import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setPhase } from '../store/slices/gameSlice';
import { calculatePercentile } from '../utils/scoring';
import { db } from '../db/db';

const ResultScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user);
  const [todayScore, setTodayScore] = useState(0);

  useEffect(() => {
    const fetchTodayStats = async () => {
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayPrefix = `s_${localDate}`;
      const logs = await db.trialLogs.filter(log => log.session_id === todayPrefix).toArray();
      const score = logs.reduce((sum, log) => sum + log.fluency_score, 0);
      setTodayScore(Math.round(score * 10) / 10);
    };
    fetchTodayStats();
  }, []);

  if (!user.profile) return null;

  const percentile = calculatePercentile(user.profile.age_months, user.profile.total_wm_score);

  return (
    <div className="result-screen">
      <h2>トレーニング完了！</h2>
      
      <div className="stats-container">
        <div className="stat-card">
          <h3>今日のスコア</h3>
          <p className="score">{todayScore}</p>
        </div>
        <div className="stat-card">
          <h3>トータルWMスコア</h3>
          <p className="score">{Math.round(user.profile.total_wm_score * 10) / 10}</p>
        </div>
        <div className="stat-card">
          <h3>同年代パーセンタイル</h3>
          <p className="score">上位 {percentile}%</p>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-label">次のレベルまでの進捗（目安）</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, (user.profile.total_wm_score % 500) / 5)}%` }} />
        </div>
      </div>

      <button 
        onClick={() => dispatch(setPhase('idle'))}
        style={{ touchAction: 'manipulation' }}
      >
        トップへ戻る
      </button>
    </div>
  );
};

export default ResultScreen;
