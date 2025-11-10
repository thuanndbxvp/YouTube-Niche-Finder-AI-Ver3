
import React from 'react';
import type { Theme } from '../theme';

interface SearchBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  handleAnalysis: () => void;
  isLoading: boolean;
  placeholder: string;
  theme: Theme;
}

const SearchBar: React.FC<SearchBarProps> = ({ userInput, setUserInput, handleAnalysis, isLoading, placeholder, theme }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      handleAnalysis();
    }
  };
  
  return (
    <div className="w-full max-w-2xl">
      <div className="relative w-full">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-4 pr-12 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 ${theme.focusRing} ${theme.border} outline-none transition-all duration-300 placeholder-gray-500`}
          disabled={isLoading}
        />
         <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
    </div>
  );
};

export default SearchBar;
