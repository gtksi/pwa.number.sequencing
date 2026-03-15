import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type GamePhase = 'idle' | 'memorize' | 'recall' | 'result';

interface GameState {
  phase: GamePhase;
  currentTrial: number;
  maxTrials: number;
  sequence: number[];
  inputSequence: number[];
  errorsInCurrentTrial: number;
  startTime: number | null;
  // Dynamic difficulty variables
  currentSubLevel: string;
  digits: number;
  displaySpeedMs: number;
  dummyCards: number;
}

const initialState: GameState = {
  phase: 'idle',
  currentTrial: 0,
  maxTrials: 10, // Fixed session trials
  sequence: [],
  inputSequence: [],
  errorsInCurrentTrial: 0,
  startTime: null,
  currentSubLevel: '1.1',
  digits: 2,
  displaySpeedMs: 2000,
  dummyCards: 0,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGameSession(state) {
      state.phase = 'idle';
      state.currentTrial = 0;
    },
    startTrial(state, action: PayloadAction<{ sequence: number[], digits: number, displaySpeedMs: number, dummyCards: number }>) {
      state.phase = 'memorize';
      state.sequence = action.payload.sequence;
      state.digits = action.payload.digits;
      state.displaySpeedMs = action.payload.displaySpeedMs;
      state.dummyCards = action.payload.dummyCards;
      state.inputSequence = [];
      state.errorsInCurrentTrial = 0;
      state.startTime = null;
    },
    transitionToRecall(state) {
      state.phase = 'recall';
      state.startTime = Date.now();
    },
    registerInput(state, action: PayloadAction<number>) {
      state.inputSequence.push(action.payload);
    },
    registerError(state) {
      state.errorsInCurrentTrial += 1;
    },
    completeTrial(state) {
      state.currentTrial += 1;
      if (state.currentTrial >= state.maxTrials) {
        state.phase = 'result';
      } else {
        state.phase = 'idle'; // Wait for next trial
      }
    },
    setPhase(state, action: PayloadAction<GamePhase>) {
      state.phase = action.payload;
    }
  },
});

export const { startGameSession, startTrial, transitionToRecall, registerInput, registerError, completeTrial, setPhase } = gameSlice.actions;
export default gameSlice.reducer;
