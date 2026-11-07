import React, { useState } from 'react';
import { Flashcard } from '../types';
import { RotateCw, CheckCircle2, Award, Clock, ArrowRight, X, Sparkles, Plus } from 'lucide-react';

interface FlashcardReviewModalProps {
  flashcards: Flashcard[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateFlashcard: (card: Flashcard) => void;
  onAddCard: (card: Flashcard) => void;
  currentPageIndex: number;
}

export const FlashcardReviewModal: React.FC<FlashcardReviewModalProps> = ({
  flashcards,
  isOpen,
  onClose,
  onUpdateFlashcard,
  onAddCard,
  currentPageIndex,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<'review' | 'create'>('review');

  // New card form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newTags, setNewTags] = useState('Study Notes');

  if (!isOpen) return null;

  const currentCard = flashcards[currentIndex];
  const isFinished = currentIndex >= flashcards.length;

  // SuperMemo SM-2 calculation
  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    let { easeFactor, intervalDays, repetitions } = currentCard;

    if (rating === 1) {
      // Again (Failed)
      repetitions = 0;
      intervalDays = 1;
    } else {
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitions += 1;

      // Adjust ease factor
      easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02))
      );
    }

    const updatedCard: Flashcard = {
      ...currentCard,
      easeFactor: Number(easeFactor.toFixed(2)),
      intervalDays,
      repetitions,
      dueDate: Date.now() + intervalDays * 86400000,
    };

    onUpdateFlashcard(updatedCard);
    setIsFlipped(false);
    setCurrentIndex((idx) => idx + 1);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      pageIndex: currentPageIndex,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueDate: Date.now(),
    };

    onAddCard(newCard);
    setNewQuestion('');
    setNewAnswer('');
    setMode('review');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              SRS
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Spaced Repetition Review
              </h2>
              <p className="text-xs text-stone-500">
                {flashcards.length} cards in this notebook
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'review' ? 'create' : 'review')}
              className="text-xs px-2.5 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200 rounded-md flex items-center gap-1 font-medium transition-colors"
            >
              {mode === 'review' ? <Plus className="w-3.5 h-3.5" /> : null}
              <span>{mode === 'review' ? 'New Card' : 'Back to Review'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col">
          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Create Flashcard from Page {currentPageIndex + 1}
              </h3>
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Front (Question / Prompt)
                </label>
                <textarea
                  required
                  rows={3}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g., What are the two simultaneous triggers for NMDA receptor opening?"
                  className="w-full text-xs p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Back (Answer / Explanation)
                </label>
                <textarea
                  required
                  rows={4}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="e.g., 1. Glutamate binding to the active site. 2. Postsynaptic depolarization to dislodge the Mg2+ pore block."
                  className="w-full text-xs p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. Neuroscience, Midterm 1"
                  className="w-full text-xs px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('review')}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          ) : isFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  Review Complete!
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  You reviewed all {flashcards.length} cards scheduled for today. Spaced intervals have been updated based on your recall accuracy.
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className="flex items-center gap-1.5 text-xs px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg font-medium hover:bg-stone-800"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Review Again</span>
              </button>
            </div>
          ) : currentCard ? (
            <div className="flex-1 flex flex-col justify-between">
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-stone-400 pb-3 mb-2 border-b border-stone-100 dark:border-stone-800">
                <span>
                  Card {currentIndex + 1} of {flashcards.length}
                </span>
                <span className="text-[11px] bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-600 dark:text-stone-400">
                  Linked to Page {currentCard.pageIndex + 1}
                </span>
              </div>

              {/* Flashcard Body */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[220px] cursor-pointer rounded-xl p-6 border transition-all duration-200 flex flex-col justify-between select-none ${
                  isFlipped
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
                    : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center justify-between">
                    <span>{isFlipped ? 'Answer & Explanation' : 'Question'}</span>
                    <span className="text-[10px] lowercase text-stone-400">click to flip</span>
                  </div>
                  <div className="text-stone-900 dark:text-stone-100 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </div>
                </div>

                {currentCard.tags && currentCard.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-4 text-[11px] text-stone-400">
                    {currentCard.tags.map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating Controls */}
              <div className="pt-6">
                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors"
                  >
                    Show Answer
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRate(1)}
                      className="flex flex-col items-center py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Again</span>
                      <span className="text-[10px] font-normal text-rose-500">1d</span>
                    </button>
                    <button
                      onClick={() => handleRate(2)}
                      className="flex flex-col items-center py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Hard</span>
                      <span className="text-[10px] font-normal text-amber-500">2d</span>
                    </button>
                    <button
                      onClick={() => handleRate(3)}
                      className="flex flex-col items-center py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Good</span>
                      <span className="text-[10px] font-normal text-emerald-500">{currentCard.intervalDays || 3}d</span>
                    </button>
                    <button
                      onClick={() => handleRate(4)}
                      className="flex flex-col items-center py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Easy</span>
                      <span className="text-[10px] font-normal text-sky-500">{(currentCard.intervalDays || 3) * 2}d</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
