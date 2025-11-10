




import React from 'react';
import type { AnalysisResult, Niche, ContentPlanResult } from '../types';
import NicheCard from './NicheCard';
import { PlusCircleIcon } from './icons/Icons';

interface ResultsDisplayProps {
  result: AnalysisResult;
  onDevelop: (nicheName: string) => void;
  analysisDepth: number;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  savedNiches: Niche[];
  onUseNiche: (niche: Niche) => void;
  onViewPlan: (niche: Niche) => void;
  generatingNiches: Set<string>;
  contentPlanCache: Record<string, ContentPlanResult>;
  numResults: string;
  onGenerateVideoIdeas: (niche: Niche) => void;
  generatingVideoIdeas: Set<string>;
  onExportVideoIdeas: (niche: Niche) => void;
  onExportNiche: (niche: Niche) => void;
  isDirectAnalysis: boolean;
  theme: string;
  onGenerateChannelPlan: (niche: Niche) => void;
  generatingChannelPlan: Set<string>;
  channelPlanCache: Record<string, string>;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onDevelop, analysisDepth, onLoadMore, isLoadingMore, savedNiches, onUseNiche, onViewPlan, generatingNiches, contentPlanCache, numResults, onGenerateVideoIdeas, generatingVideoIdeas, onExportVideoIdeas, onExportNiche, isDirectAnalysis, theme, onGenerateChannelPlan, generatingChannelPlan, channelPlanCache }) => {
  
  const numToAdd = parseInt(numResults, 10);

  return (
    <div className="w-full flex flex-col gap-8 mt-6">
      {result.niches.map((niche, index) => {
        const isSaved = savedNiches.some(saved => saved.niche_name.original === niche.niche_name.original);
        const hasContentPlan = !!contentPlanCache[niche.niche_name.original];
        const isGenerating = generatingNiches.has(niche.niche_name.original);
        const isGeneratingIdeas = generatingVideoIdeas.has(niche.niche_name.original);
        const isGeneratingPlan = generatingChannelPlan.has(niche.niche_name.original);
        return (
            <NicheCard 
              key={`${niche.niche_name.original}-${index}`} 
              niche={niche}
              index={index}
              onDevelop={onDevelop}
              analysisDepth={analysisDepth}
              isSaved={isSaved}
              onUseNiche={onUseNiche}
              onViewPlan={onViewPlan}
              isGeneratingContent={isGenerating}
              hasContentPlan={hasContentPlan}
              onGenerateVideoIdeas={onGenerateVideoIdeas}
              isGeneratingIdeas={isGeneratingIdeas}
              onExportVideoIdeas={onExportVideoIdeas}
              onExportNiche={onExportNiche}
              isDirectAnalysis={isDirectAnalysis}
              theme={theme}
              onGenerateChannelPlan={onGenerateChannelPlan}
              isGeneratingChannelPlan={isGeneratingPlan}
              channelPlanCache={channelPlanCache}
            />
        );
      })}
      {!isDirectAnalysis && (
        <div className="flex justify-center mt-4">
          <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isLoadingMore ? (
                  <>
                      <div className="w-5 h-5 border-2 border-t-teal-400 border-gray-500 rounded-full animate-spin"></div>
                      <span>Đang tải thêm...</span>
                  </>
              ) : (
                  <>
                      <PlusCircleIcon />
                      <span>Thêm {numToAdd} kết quả</span>
                  </>
              )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;