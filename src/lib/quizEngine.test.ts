import { generateQuizOptions, selectFairQuestionSet } from './quizEngine';
import { QuestionData } from '@/types';

describe('Quiz Engine', () => {
  const mockQuestions: QuestionData[] = [
    { id: '1', word: 'apple', japanese: 'りんご', paragraph: 'I eat an _.', phonetic: 'æpl' },
    { id: '2', word: 'banana', japanese: 'ばなな', paragraph: 'A yellow _.', phonetic: 'bəˈnænə' },
    { id: '3', word: 'cherry', japanese: 'さくらんぼ', paragraph: 'A red _.', phonetic: 'ˈtʃeri' },
    { id: '4', word: 'date', japanese: 'デーツ', paragraph: 'A sweet _.', phonetic: 'deɪt' },
    { id: '5', word: 'elderberry', japanese: 'エルダーベリー', paragraph: 'A small _.', phonetic: 'ˈeldərbəri' },
  ];

  it('generates 4 options for en_to_ja mode', () => {
    const correct = mockQuestions[0]; // apple
    const choices = generateQuizOptions(correct, mockQuestions, 'en_to_ja', 4);
    
    expect(choices).toHaveLength(4);
    const correctChoice = choices.find(c => c.isCorrect);
    expect(correctChoice?.text).toBe('りんご');
    expect(correctChoice?.id).toBe('1');
    
    const incorrectChoices = choices.filter(c => !c.isCorrect);
    expect(incorrectChoices).toHaveLength(3);
  });

  it('generates 4 options for fill_in_the_blank mode', () => {
    const correct = mockQuestions[1]; // banana
    const choices = generateQuizOptions(correct, mockQuestions, 'fill_in_the_blank', 4);
    
    expect(choices).toHaveLength(4);
    const correctChoice = choices.find(c => c.isCorrect);
    expect(correctChoice?.text).toBe('banana');
  });

  it('handles cases with fewer available dummies gracefully', () => {
    const smallList = [mockQuestions[0], mockQuestions[1]]; // Only 2 questions
    const choices = generateQuizOptions(mockQuestions[0], smallList, 'en_to_ja', 4);
    
    // Only 2 total choices are possible
    expect(choices).toHaveLength(2);
  });

  it('prioritizes unanswered questions first in a fair question set', () => {
    const sampleQuestions: QuestionData[] = [
      { id: '1', word: 'apple', japanese: 'りんご', paragraph: 'I eat an _.', phonetic: 'æpl', correctCount: 1, incorrectCount: 0, lastStudiedAt: Date.now() - 100000 },
      { id: '2', word: 'banana', japanese: 'ばなな', paragraph: 'A yellow _.', phonetic: 'bəˈnænə' },
      { id: '3', word: 'cherry', japanese: 'さくらんぼ', paragraph: 'A red _.', phonetic: 'ˈtʃeri' },
    ];

    const selected = selectFairQuestionSet(sampleQuestions, 2);
    expect(selected.map((q) => q.id).sort()).toEqual(['2', '3']);
  });

  it('prefers questions with fewer total attempts when selecting a fair set', () => {
    const sampleQuestions: QuestionData[] = [
      { id: '1', word: 'apple', japanese: 'りんご', paragraph: 'I eat an _.', phonetic: 'æpl', correctCount: 2, incorrectCount: 0, lastStudiedAt: Date.now() - 200000 },
      { id: '2', word: 'banana', japanese: 'ばなな', paragraph: 'A yellow _.', phonetic: 'bəˈnænə', correctCount: 1, incorrectCount: 0, lastStudiedAt: Date.now() - 100000 },
      { id: '3', word: 'cherry', japanese: 'さくらんぼ', paragraph: 'A red _.', phonetic: 'ˈtʃeri', correctCount: 1, incorrectCount: 0, lastStudiedAt: Date.now() - 50000 },
    ];

    const selected = selectFairQuestionSet(sampleQuestions, 2);
    expect(selected.map((q) => q.id).sort()).toEqual(['2', '3']);
  });
});
