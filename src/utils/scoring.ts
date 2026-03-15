export const calculateFluencyScore = (
  actualTimeSec: number, 
  targetTimeSec: number, 
  errors: number
): number => {
  // Base score 100
  // Penalty for excess time: Max 0, (actual - target) * 5
  // Penalty for errors: errors * 15
  const timePenalty = actualTimeSec > targetTimeSec ? (actualTimeSec - targetTimeSec) * 5 : 0;
  const errorPenalty = errors * 15;
  const score = Math.max(0, 100 - timePenalty - errorPenalty);
  return Math.round(score * 10) / 10;
};

// Mock percentile static data for fallback/offline calculation
const percentileData: Record<number, { minScore: number, percentile: number }[]> = {
  120: [ // Approx 10 years old
    { minScore: 500, percentile: 90 },
    { minScore: 400, percentile: 75 },
    { minScore: 300, percentile: 50 },
    { minScore: 200, percentile: 25 },
    { minScore: 0,   percentile: 10 }
  ]
};

export const calculatePercentile = (_ageMonths: number, totalScore: number): number => {
  // In a real app we would map _ageMonths to the nearest bucket. 
  // We'll just use the 120 bucket for this mock logic.
  const bucket = percentileData[120] || percentileData[Number(Object.keys(percentileData)[0])];
  for (const threshold of bucket) {
    if (totalScore >= threshold.minScore) {
      return threshold.percentile;
    }
  }
  return 10;
};
