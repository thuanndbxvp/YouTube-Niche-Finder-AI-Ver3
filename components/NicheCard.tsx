// Fix: Implement the NicheCard component to display analysis results.
import React from 'react';
import type { Niche } from '../types';
import { themes } from '../theme';
import {
  DollarSignIcon,
  UserGroupIcon,
  SparklesIcon,
  TrendingUpIcon,
  LightBulbIcon,
  TargetIcon,
  ShieldCheckIcon,
  DownloadIcon,
  ClipboardListIcon,
} from './icons/Icons';

interface NicheCardProps {
  niche: Niche;
  index: number;
  onDevelop: (nicheName: string) => void;
  analysisDepth: number;
  isSaved: boolean;
  onUseNiche: (niche: Niche) => void;
  onViewPlan: (niche: Niche) => void;
  isGeneratingContent: boolean;
  hasContentPlan: boolean;
  onGenerateVideoIdeas: (niche: Niche) => void;
  isGeneratingIdeas: boolean;
  onExportVideoIdeas: (niche: Niche) => void;
  onExportNiche: (niche: Niche) => void;
  isDirectAnalysis: boolean;
  theme: string;
  onGenerateChannelPlan: (niche: Niche) => void;
  isGeneratingChannelPlan: boolean;
  channelPlanCache: Record<string, string>;
}

interface AnalysisMetricProps {
    icon: React.ReactNode;
    label: string;
    score: number;
    explanation: string;
    rpm?: string;
    isCompetition?: boolean;
}

const AnalysisMetric: React.FC<AnalysisMetricProps> = ({ icon, label, score, explanation, rpm, isCompetition = false }) => {
    const getProgressBarColor = (s: number) => {
        if (isCompetition) { // lower is better
            if (s <= 33) return 'bg-green-500';
            if (s <= 66) return 'bg-yellow-500';
            return 'bg-red-500';
        } else { // higher is better
            if (s >= 66) return 'bg-green-500';
            if (s >= 33) return 'bg-yellow-500';
            return 'bg-red-500';
        }
    };
    const color = getProgressBarColor(score);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2 font-semibold text-gray-300">
                    {icon}
                    <span>{label}</span>
                    {rpm && <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded">{rpm}</span>}
                </div>
                <span className="font-bold">{score}/100</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 pt-1">{explanation}</p>
        </div>
    );
};


const NicheCard: React.FC<NicheCardProps> = ({ niche, index, onDevelop, isSaved, onUseNiche, onViewPlan, isGeneratingContent, hasContentPlan, onGenerateVideoIdeas, isGeneratingIdeas, onExportVideoIdeas, onExportNiche, isDirectAnalysis, theme, onGenerateChannelPlan, isGeneratingChannelPlan, channelPlanCache }) => {
    const hasVideoIdeas = niche.video_ideas && niche.video_ideas.length > 0;
    const currentTheme = themes[theme] || themes.teal;
    const hasChannelPlan = !!channelPlanCache[niche.niche_name.original];

    return (
        <div className={`border border-gray-700 rounded-2xl shadow-lg p-6 w-full text-left transition-all duration-300 ${currentTheme.borderHover} hover:shadow-teal-500/10 flex flex-col ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/80'}`}>
            <div className="flex-grow">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow">
                        <div className="flex items-center gap-3">
                            <h2 className={`text-2xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>
                              {!isDirectAnalysis && <span className="text-gray-500">{index + 1}.</span>} {niche.niche_name.original}
                            </h2>
                            {isSaved && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${currentTheme.bg} self-center`}>
                                    ĐÃ LƯU
                                </span>
                            )}
                        </div>
                        <h3 className={`text-lg text-gray-400 -mt-1 ${!isDirectAnalysis ? 'pl-8' : ''}`}>{niche.niche_name.translated}</h3>
                    </div>
                    <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                        <button
                            onClick={() => onExportNiche(niche)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-500 hover:text-white transition-all duration-300 text-sm"
                            title="Tải chi tiết ngách (không bao gồm ý tưởng video)"
                        >
                            <DownloadIcon />
                            <span>Tải Chi Tiết</span>
                        </button>
                        <button
                            onClick={() => onGenerateChannelPlan(niche)}
                            disabled={isGeneratingChannelPlan}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.bgHover} text-sm`}
                            title="Tạo kế hoạch phát triển kênh chi tiết"
                        >
                            {isGeneratingChannelPlan ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-t-white border-gray-800 rounded-full animate-spin"></div>
                                    <span>Đang tạo...</span>
                                </>
                            ) : (
                                <>
                                    <ClipboardListIcon />
                                    <span>{hasChannelPlan ? 'Xem Kế Hoạch' : 'Kế hoạch xây kênh'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <p className="text-gray-400 mb-6">{niche.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-gray-900/50 p-4 rounded-lg space-y-4 flex-1">
                            <h3 className="font-semibold text-gray-200 flex items-center"><TargetIcon /> <span className="ml-2">Đối tượng mục tiêu</span></h3>
                            <p className="text-gray-400 text-sm">{niche.audience_demographics}</p>
                        </div>
                         <div className="bg-gray-900/50 p-4 rounded-lg space-y-4 flex-1">
                            <h3 className="font-semibold text-gray-200 flex items-center"><LightBulbIcon /> <span className="ml-2">Chiến lược nội dung</span></h3>
                            <p className="text-gray-400 text-sm">{niche.content_strategy}</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-1 bg-gray-900/50 p-4 rounded-lg space-y-5">
                        <h3 className="font-semibold text-gray-200 mb-2">Phân Tích Ngách</h3>
                        <AnalysisMetric icon={<TrendingUpIcon />} label="Mức Độ Quan Tâm" score={niche.analysis.interest_level.score} explanation={niche.analysis.interest_level.explanation} />
                        <AnalysisMetric icon={<DollarSignIcon />} label="Tiềm Năng Kiếm Tiền" score={niche.analysis.monetization_potential.score} explanation={niche.analysis.monetization_potential.explanation} rpm={niche.analysis.monetization_potential.rpm_estimate} />
                        <AnalysisMetric icon={<SparklesIcon />} label="Mức Độ Cạnh Tranh" score={niche.analysis.competition_level.score} explanation={niche.analysis.competition_level.explanation} isCompetition={true} />
                        <AnalysisMetric icon={<ShieldCheckIcon />} label="Tính Bền Vững" score={niche.analysis.sustainability.score} explanation={niche.analysis.sustainability.explanation} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center"><UserGroupIcon /> <span className="ml-2">Ý tưởng Video</span></h3>
                        
                        {hasVideoIdeas ? (
                            <div className="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-700/50">
                                <table className="w-full text-sm table-fixed">
                                    <thead className={`bg-opacity-20 ${currentTheme.bg}`}>
                                        <tr>
                                            <th className="text-center font-semibold text-gray-200 p-3 w-16">STT</th>
                                            <th className="text-left font-semibold text-gray-200 p-3 w-2/5">Tiêu đề</th>
                                            <th className="text-left font-semibold text-gray-200 p-3">Nội dung phác họa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {niche.video_ideas.map((idea, i) => (
                                            <tr key={i} className="border-t border-gray-700/50 transition-colors odd:bg-gray-800/30 even:bg-gray-800/60 hover:bg-gray-700/50">
                                                <td className="p-3 align-top text-center">
                                                   <span className={`h-6 w-6 inline-flex items-center justify-center font-bold rounded-full text-white ${currentTheme.bg}`}>
                                                       {i + 1}
                                                   </span>
                                                </td>
                                                <td className="p-3 align-top break-words">
                                                    <p className={`font-semibold ${currentTheme.text}`}>{idea.title.original}</p>
                                                    <p className="text-xs text-gray-400 italic mt-1">{idea.title.translated}</p>
                                                </td>
                                                <td className="p-3 text-gray-400 align-top break-words">
                                                    {idea.draft_content}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <div className="flex justify-center items-center p-4 bg-gray-900/50 rounded-lg border border-dashed border-gray-700/50">
                                <p className="text-gray-500 italic">Hãy bấm nút Tạo ý tưởng video để tạo nội dung gợi ý.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/60 flex flex-wrap items-center justify-center sm:justify-end gap-3">
                <button
                    onClick={() => onGenerateVideoIdeas(niche)}
                    disabled={isGeneratingIdeas}
                    className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.bgHover}`}
                >
                    {isGeneratingIdeas ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-white border-indigo-800 rounded-full animate-spin mr-2"></div>
                            <span>Đang tạo...</span>
                        </>
                    ) : (
                        <span>{hasVideoIdeas ? 'Thêm ý tưởng Video' : 'Tạo ý tưởng Video'}</span>
                    )}
                </button>
                
                {hasVideoIdeas && (
                    <button
                        onClick={() => onExportVideoIdeas(niche)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-500 hover:text-white transition-all duration-300 transform hover:scale-105"
                    >
                        <DownloadIcon />
                        <span>Tải Ý Tưởng Video</span>
                    </button>
                )}
                
                {!isDirectAnalysis && (
                    <button
                        onClick={() => onDevelop(niche.niche_name.original)}
                        disabled={isGeneratingContent}
                        className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.bgHover}`}
                    >
                        <span>Phát triển thêm ý tưởng</span>
                    </button>
                )}

                {(hasVideoIdeas || hasContentPlan) && (
                    <button
                        onClick={() => hasContentPlan ? onViewPlan(niche) : onUseNiche(niche)}
                        disabled={isGeneratingContent}
                        className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.bgHover}`}
                    >
                        {isGeneratingContent ? (
                            <>
                                <div className="w-5 h-5 border-2 border-t-white border-green-800 rounded-full animate-spin mr-2"></div>
                                <span>Đang tạo...</span>
                            </>
                        ) : (
                            <span>{hasContentPlan ? 'Xem lại kế hoạch' : 'Sử dụng Niche này'}</span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default NicheCard;