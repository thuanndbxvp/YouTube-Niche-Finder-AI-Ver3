
import React, { useState, useMemo } from 'react';
import { nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from '../data/knowledgeBase';
import { PlusCircleIcon } from './icons/Icons';
import { themes } from '../theme';

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const SUGGESTIONS_BATCH_SIZE = 50;

const InitialSuggestions: React.FC<{ setUserInput: (value: string) => void; theme: string; }> = ({ setUserInput, theme }) => {
  // Memoize the full shuffled list of suggestions so it doesn't change on re-renders.
  const shuffledSuggestions = useMemo(() => {
    const pool = parseKnowledgeBaseForSuggestions(nicheKnowledgeBase);
    return shuffleArray(pool);
  }, []);

  const [visibleCount, setVisibleCount] = useState<number>(SUGGESTIONS_BATCH_SIZE);
  const currentTheme = themes[theme] || themes.teal;


  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + SUGGESTIONS_BATCH_SIZE);
  };
  
  const displayedSuggestions = shuffledSuggestions.slice(0, visibleCount);

  return (
    <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-xl">
      <p className="text-xl font-medium">Kết quả phân tích ngách sẽ xuất hiện ở đây.</p>
      <p className={`mt-4 mb-6 text-lg font-medium bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>Bắt đầu bằng cách nhập một ý tưởng, hoặc chọn một trong các gợi ý dưới đây:</p>
      <div className="flex flex-wrap justify-center gap-3">
        {displayedSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => setUserInput(suggestion)}
            className={`px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full border border-gray-700 transition-colors ${currentTheme.textHover} ${currentTheme.borderHover}`}
          >
            {suggestion}
          </button>
        ))}
      </div>
      
      {visibleCount < shuffledSuggestions.length && (
        <div className="mt-8 flex justify-center">
            <button
                onClick={handleLoadMore}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300"
            >
                <PlusCircleIcon />
                <span>Nhiều gợi ý hơn</span>
            </button>
        </div>
      )}
    </div>
  );
};

export default InitialSuggestions;
