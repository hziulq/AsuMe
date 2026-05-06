export const playAudio = (text: string, lang: string = 'en-US') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  
  window.speechSynthesis.speak(utterance);
};
