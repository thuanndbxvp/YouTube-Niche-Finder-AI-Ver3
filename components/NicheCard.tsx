
import React from 'react';
import type { Niche } from '../types';
import { themes } from '../theme';
import {
  DollarSignIcon, UserGroupIcon, SparklesIcon, TrendingUpIcon, LightBulbIcon,
  TargetIcon, ShieldCheckIcon, DownloadIcon, ClipboardListIcon, BrainIcon, BookmarkIcon,
  TagIcon, CollectionIcon
} from './icons/Icons';

interface NicheCardProps {
  niche: Niche;
  index: number;
  onDevelop: (nicheName: string) => void;
  isSaved: boolean;
  onUseNiche: (niche: Niche) => void;
  onViewPlan: (niche: Niche) => void;
  isGeneratingContent: boolean;
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

const AnalysisMetric: React.FC<{ icon: React.ReactNode; label: string; score: number; explanation: string; rpm?: string; isCompetition?: boolean; }> = ({ icon, label, score, explanation, rpm, isCompetition = false }) => {
    const color = isCompetition 
        ? (score <= 33 ? 'bg-green-500' : score <= 66 ? 'bg-yellow-500' : 'bg-red-500')
        : (score >= 66 ? 'bg-green-500' : score >= 33 ? 'bg-yellow-500' : 'bg-red-500');
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2 font-semibold text-gray-300">
                    {icon} <span>{label}</span> {rpm && <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded">{rpm}</span>}
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

const NicheCard: React.FC<NicheCardProps> = ({ niche, index, isSaved, onExportNiche, onGenerateChannelPlan, isGeneratingChannelPlan, theme, isDirectAnalysis, channelPlanCache, onUseNiche }) => {
    const currentTheme = themes[theme] || themes.teal;
    const hasChannelPlan = !!channelPlanCache[niche.niche_name.original];

    return (
        <div className={`border border-gray-700 rounded-2xl shadow-lg p-6 w-full text-left transition-all duration-300 ${currentTheme.borderHover} flex flex-col ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/80'}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className={`text-2xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>
                        {!isDirectAnalysis && <span className="text-gray-500">{index + 1}.</span>} {niche.niche_name.original}
                    </h2>
                    <h3 className="text-lg text-gray-400">{niche.niche_name.translated}</h3>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onUseNiche(niche)} 
                        title={isSaved ? "Bỏ lưu" : "Lưu vào thư viện"} 
                        className={`p-2 rounded-lg border transition-all duration-300 shadow-sm ${
                            isSaved 
                                ? `${currentTheme.bg} border-transparent text-white hover:brightness-110 hover:shadow-md` 
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-400 hover:text-white'
                        }`}
                    >
                        <BookmarkIcon />
                    </button>
                    <button 
                        onClick={() => onExportNiche(niche)} 
                        title="Xuất file TXT" 
                        className="p-2 rounded-lg border bg-gray-800 border-gray-600 text-gray-400 transition-all duration-300 shadow-sm hover:bg-gray-700 hover:border-gray-400 hover:text-white"
                    >
                        <DownloadIcon />
                    </button>
                    
                    <button 
                        onClick={() => onGenerateChannelPlan(niche)} 
                        disabled={isGeneratingChannelPlan} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-lg ${
                            isGeneratingChannelPlan 
                                ? 'bg-gray-600 text-gray-300 cursor-wait' 
                                : `${currentTheme.bg} text-white hover:brightness-110 hover:shadow-xl hover:-translate-y-0.5`
                        }`}
                    >
                        {isGeneratingChannelPlan ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Đang lập...</span>
                            </>
                        ) : (
                            <>
                                <ClipboardListIcon />
                                <span>{hasChannelPlan ? 'Xem Kế Hoạch' : 'Lập kế hoạch xây kênh'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900/40 p-5 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-gray-200 flex items-center gap-2 mb-3"><SparklesIcon /> Phân tích mô hình sản xuất</h4>
                        <AnalysisMetric icon={<BrainIcon />} label="Độ phù hợp mô hình" score={niche.production_analysis.suitability_score} explanation={niche.production_analysis.reasoning} />
                        <div className="mt-4 p-3 bg-teal-900/20 border border-teal-800/30 rounded-lg">
                            <h5 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">Khả năng nhân rộng (Scalability)</h5>
                            <p className="text-sm text-gray-300">{niche.production_analysis.scalability}</p>
                        </div>
                    </div>
                    
                    {/* Thêm phần Keywords & Sources */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                            <h5 className="font-bold text-gray-300 flex items-center gap-2 mb-3"><TagIcon /> Keywords gợi ý</h5>
                            <div className="flex flex-wrap gap-2">
                                {niche.target_keywords?.map((kw, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-[11px] text-gray-300 font-mono">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                            <h5 className="font-bold text-gray-300 flex items-center gap-2 mb-3"><CollectionIcon /> Nguồn tư liệu</h5>
                            <ul className="space-y-1">
                                {niche.content_sources?.map((src, i) => (
                                    <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                        <span className={currentTheme.text}>•</span> {src}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                            <h5 className="font-bold text-gray-300 flex items-center gap-2 mb-2"><TargetIcon /> Đối tượng</h5>
                            <p className="text-sm text-gray-400 leading-relaxed">{niche.audience_demographics}</p>
                        </div>
                        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                            <h5 className="font-bold text-gray-300 flex items-center gap-2 mb-2"><LightBulbIcon /> Chiến lược</h5>
                            <p className="text-sm text-gray-400 leading-relaxed">{niche.content_strategy}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700 space-y-6">
                    <h4 className="font-bold text-gray-200">Chỉ số thị trường</h4>
                    <AnalysisMetric icon={<TrendingUpIcon />} label="Quan tâm" score={niche.analysis.interest_level.score} explanation={niche.analysis.interest_level.explanation} />
                    <AnalysisMetric icon={<DollarSignIcon />} label="Kiếm tiền" score={niche.analysis.monetization_potential.score} explanation={niche.analysis.monetization_potential.explanation} rpm={niche.analysis.monetization_potential.rpm_estimate} />
                    <AnalysisMetric icon={<SparklesIcon />} label="Cạnh tranh" score={niche.analysis.competition_level.score} explanation={niche.analysis.competition_level.explanation} isCompetition={true} />
                    <AnalysisMetric icon={<ShieldCheckIcon />} label="Bền vững" score={niche.analysis.sustainability.score} explanation={niche.analysis.sustainability.explanation} />
                </div>
            </div>
            
            <p className="text-gray-400 border-t border-gray-700 pt-4 text-sm leading-relaxed">{niche.description}</p>
        </div>
    );
};

export default NicheCard;
