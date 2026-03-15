import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import type { RootState, AppDispatch } from '../store';
import { startTrial, completeTrial } from '../store/slices/gameSlice';
import { updateUserProfile } from '../store/slices/userSlice';
import { getSubLevelDef, determineNextLevel } from '../utils/dda';
import { calculateFluencyScore } from '../utils/scoring';
import { db } from '../db/db';

export const useGameLogic = () => {
  const dispatch = useDispatch<AppDispatch>();
  const game = useSelector((state: RootState) => state.game);
  const user = useSelector((state: RootState) => state.user);

  const startNextTrial = useCallback(() => {
    if (!user.profile) return;
    
    const levelDef = getSubLevelDef(user.profile.current_sub_level);
    
    // Generate a random sequence (1-9) without immediate repetitions
    const sequence: number[] = [];
    for (let i = 0; i < levelDef.digits; i++) {
      let nextNum;
      do {
        nextNum = Math.floor(Math.random() * 9) + 1;
      } while (sequence.length > 0 && nextNum === sequence[sequence.length - 1]);
      sequence.push(nextNum);
    }

    dispatch(startTrial({
      sequence,
      digits: levelDef.digits,
      displaySpeedMs: levelDef.displaySpeedMs,
      dummyCards: levelDef.dummyCards
    }));
  }, [dispatch, user.profile]);

  const finishTrial = useCallback(async (actualTimeSec: number) => {
    if (!user.profile || game.phase !== 'recall') return;

    const levelDef = getSubLevelDef(user.profile.current_sub_level);
    const score = calculateFluencyScore(actualTimeSec, levelDef.targetTimeSec, game.errorsInCurrentTrial);

    // Save to IndexedDB
    const trialLog = {
      trial_id: `t_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      session_id: `s_${new Date().toISOString().split('T')[0]}`,
      timestamp: new Date().toISOString(),
      sub_level: user.profile.current_sub_level,
      displayed_sequence: game.sequence,
      actual_time_sec: actualTimeSec,
      error_interventions: game.errorsInCurrentTrial,
      prompt_used: game.errorsInCurrentTrial >= 2,
      fluency_score: score,
      is_fatigue_detected: score < 50
    };
    
    await db.trialLogs.put(trialLog);

    // Fetch recent 3 scores for DDA
    const recentLogs = await db.trialLogs.orderBy('timestamp').reverse().limit(3).toArray();
    const recentScores = recentLogs.map(l => l.fluency_score);
    const nextLevel = determineNextLevel(user.profile.current_sub_level, recentScores);

    const newTotalScore = user.profile.total_wm_score + score;
    await db.userProfile.update(user.profile.id, {
      current_sub_level: nextLevel,
      total_wm_score: newTotalScore,
      highest_digits: Math.max(user.profile.highest_digits, levelDef.digits)
    });
    
    dispatch(updateUserProfile({
      current_sub_level: nextLevel,
      total_wm_score: newTotalScore,
      highest_digits: Math.max(user.profile.highest_digits, levelDef.digits)
    }));

    dispatch(completeTrial());
  }, [dispatch, game, user.profile]);

  return { startNextTrial, finishTrial };
};
