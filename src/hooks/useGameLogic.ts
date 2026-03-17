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

  const startNextTrial = useCallback((overrideMode?: 'forward' | 'backward' | 'sequencing') => {
    if (!user.profile) return;
    
    const activeMode = overrideMode || game.taskMode;
    const currentSubLevel = user.profile.stats[activeMode].current_sub_level;
    const levelDef = getSubLevelDef(currentSubLevel);
    
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
  }, [dispatch, user.profile, game.taskMode]);

  const finishTrial = useCallback(async (actualTimeSec: number) => {
    if (!user.profile || game.phase !== 'recall') return;

    const activeMode = game.taskMode;
    const currentSubLevel = user.profile.stats[activeMode].current_sub_level;
    const levelDef = getSubLevelDef(currentSubLevel);
    const score = calculateFluencyScore(actualTimeSec, levelDef.targetTimeSec, game.errorsInCurrentTrial);

    // Save to IndexedDB
    const trialLog = {
      trial_id: `t_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      session_id: `s_${new Date().toISOString().split('T')[0]}`,
      timestamp: new Date().toISOString(),
      task_mode: activeMode,
      sub_level: currentSubLevel,
      displayed_sequence: game.sequence,
      actual_time_sec: actualTimeSec,
      error_interventions: game.errorsInCurrentTrial,
      prompt_used: game.errorsInCurrentTrial >= 2,
      fluency_score: score,
      is_fatigue_detected: score < 50
    };
    
    await db.trialLogs.put(trialLog);

    // Fetch recent 3 scores for DDA for this mode
    const recentLogs = await db.trialLogs.orderBy('timestamp').reverse().toArray();
    const recentModeLogs = recentLogs.filter((l: any) => l.task_mode === activeMode).slice(0, 3);
    const recentScores = recentModeLogs.map(l => l.fluency_score);
    const nextLevel = determineNextLevel(currentSubLevel, recentScores);

    const newTotalScore = user.profile.total_wm_score + score;
    const newHighestDigits = Math.max(user.profile.stats[activeMode].highest_digits, levelDef.digits);
    
    const newStats = {
      ...user.profile.stats,
      [activeMode]: {
        current_sub_level: nextLevel,
        highest_digits: newHighestDigits
      }
    };

    await db.userProfile.update(user.profile.id, {
      stats: newStats,
      total_wm_score: newTotalScore
    });
    
    dispatch(updateUserProfile({
      stats: newStats,
      total_wm_score: newTotalScore
    }));

    dispatch(completeTrial());
  }, [dispatch, game, user.profile]);

  return { startNextTrial, finishTrial };
};
