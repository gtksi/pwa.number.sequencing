export interface SubLevelDef {
  id: string;
  digits: number;
  displaySpeedMs: number;
  dummyCards: number;
  targetTimeSec: number;
}

export const SUB_LEVELS: SubLevelDef[] = [
  { id: '1.1', digits: 2, displaySpeedMs: 2000, dummyCards: 0, targetTimeSec: 4.0 },
  { id: '1.2', digits: 2, displaySpeedMs: 1500, dummyCards: 0, targetTimeSec: 3.5 },
  { id: '2.1', digits: 3, displaySpeedMs: 2000, dummyCards: 0, targetTimeSec: 6.0 },
  { id: '2.2', digits: 3, displaySpeedMs: 1500, dummyCards: 0, targetTimeSec: 5.5 },
  { id: '2.3', digits: 3, displaySpeedMs: 1500, dummyCards: 1, targetTimeSec: 6.5 },
  { id: '3.1', digits: 4, displaySpeedMs: 2000, dummyCards: 0, targetTimeSec: 8.0 },
  { id: '3.2', digits: 4, displaySpeedMs: 1500, dummyCards: 0, targetTimeSec: 7.5 },
  { id: '3.3', digits: 4, displaySpeedMs: 1500, dummyCards: 2, targetTimeSec: 8.5 },
  { id: '4.1', digits: 5, displaySpeedMs: 2000, dummyCards: 0, targetTimeSec: 10.0 },
  { id: '4.2', digits: 5, displaySpeedMs: 1500, dummyCards: 0, targetTimeSec: 9.5 },
  { id: '5.1', digits: 6, displaySpeedMs: 2000, dummyCards: 0, targetTimeSec: 12.0 },
  { id: '5.2', digits: 6, displaySpeedMs: 1500, dummyCards: 0, targetTimeSec: 11.5 },
];

export const determineNextLevel = (currentLevelId: string, recentScores: number[]): string => {
  if (recentScores.length < 3) return currentLevelId; // Need history to adjust

  const lastThree = recentScores.slice(-3);
  const avgScore = lastThree.reduce((sum, score) => sum + score, 0) / 3;
  
  const currentIndex = SUB_LEVELS.findIndex(l => l.id === currentLevelId);
  if (currentIndex === -1) return currentLevelId;

  // Level up if performance is consistently excellent
  if (avgScore > 85 && currentIndex < SUB_LEVELS.length - 1) {
    return SUB_LEVELS[currentIndex + 1].id;
  }
  
  // Level down if performance indicates cognitive overload / fatigue
  if (avgScore < 50 && currentIndex > 0) {
    return SUB_LEVELS[currentIndex - 1].id;
  }

  return currentLevelId;
};

export const getSubLevelDef = (levelId: string): SubLevelDef => {
  return SUB_LEVELS.find(l => l.id === levelId) || SUB_LEVELS[0];
};
