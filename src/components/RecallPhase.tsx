import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { registerError } from '../store/slices/gameSlice';
import { useGameLogic } from '../hooks/useGameLogic';

interface CardState {
  num: number;
  status: 'available' | 'placed' | 'shaking' | 'disabled';
}

const RecallPhase = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { sequence, dummyCards, taskMode, startTime } = useSelector(
    (state: RootState) => state.game
  );
  const { finishTrial } = useGameLogic();
  const finishTrialRef = useRef(finishTrial);
  finishTrialRef.current = finishTrial;

  const expectedAnswers = useMemo(() => {
    if (taskMode === 'forward') return [...sequence];
    if (taskMode === 'backward') return [...sequence].reverse();
    return [...sequence].sort((a, b) => a - b); // sequencing
  }, [sequence, taskMode]);

  const allCardNums = useMemo(() => {
    const cards = [...sequence];
    const used = new Set(cards);
    for (let i = 0; i < dummyCards; i++) {
      let dummy: number;
      do {
        dummy = Math.floor(Math.random() * 9) + 1;
      } while (used.has(dummy));
      used.add(dummy);
      cards.push(dummy);
    }
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }, [sequence, dummyCards]);

  const [cards, setCards] = useState<CardState[]>(() =>
    allCardNums.map((num) => ({ num, status: 'available' as const }))
  );
  const [filledSlots, setFilledSlots] = useState<(number | null)[]>(
    () => new Array(expectedAnswers.length).fill(null)
  );
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [completedAnimation, setCompletedAnimation] = useState(false);

  const instructionText = useMemo(() => {
    if (taskMode === 'forward') return 'そのままの順番で入れてね';
    if (taskMode === 'backward') return '逆の順番で入れてね';
    return '小さい順に入れてね';
  }, [taskMode]);

  // Handle trial completion
  useEffect(() => {
    if (completedAnimation) {
      const actualTimeSec = (Date.now() - (startTime || Date.now())) / 1000;
      const timer = setTimeout(() => finishTrialRef.current(actualTimeSec), 500);
      return () => clearTimeout(timer);
    }
  }, [completedAnimation, startTime]);

  const handleCardTap = useCallback(
    (cardIndex: number) => {
      const card = cards[cardIndex];
      if (card.status !== 'available' || currentSlotIndex >= expectedAnswers.length) return;

      const expectedNum = expectedAnswers[currentSlotIndex];

      if (card.num === expectedNum) {
        // Correct!
        setCards((prev) =>
          prev.map((c, i) => (i === cardIndex ? { ...c, status: 'placed' } : c))
        );
        setFilledSlots((prev) => {
          const next = [...prev];
          next[currentSlotIndex] = card.num;
          return next;
        });
        const nextSlotIndex = currentSlotIndex + 1;
        setCurrentSlotIndex(nextSlotIndex);
        if (nextSlotIndex === expectedAnswers.length) {
          setCompletedAnimation(true);
        }
      } else {
        // Wrong!
        dispatch(registerError());
        setCards((prev) =>
          prev.map((c, i) => (i === cardIndex ? { ...c, status: 'shaking' } : c))
        );
        // Reset shake after animation
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === cardIndex ? { ...c, status: 'available' } : c))
          );
        }, 500);
      }
    },
    [cards, currentSlotIndex, expectedAnswers, dispatch]
  );

  return (
    <div className="recall-phase">
      <p className="recall-instruction">{instructionText}</p>

      <div className="recall-slots">
        {expectedAnswers.map((_, i) => (
          <div
            key={i}
            className={`recall-slot ${filledSlots[i] !== null ? 'filled' : ''} ${
              i === currentSlotIndex ? 'active' : ''
            }`}
          >
            {filledSlots[i] !== null && (
              <span className="recall-slot-number">{filledSlots[i]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="recall-cards">
        {cards.map((card, i) => (
          <button
            key={i}
            className={`recall-card ${card.status}`}
            onClick={() => handleCardTap(i)}
            disabled={card.status !== 'available'}
          >
            {card.num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecallPhase;
