export const speakNumber = (num: number, rate: number = 1.0) => {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(num.toString());
  utterance.lang = 'ja-JP';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
};
