
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, validateApiKey, developVideoIdeas, generateVideoIdeasForNiche, validateOpenAiApiKey, analyzeNicheIdeaWithOpenAI, generateVideoIdeasForNicheWithOpenAI, developVideoIdeasWithOpenAI, generateContentPlanWithOpenAI, analyzeKeywordDirectly, analyzeKeywordDirectlyWithOpenAI, getTrainingResponseWithOpenAI, generateChannelPlan, generateChannelPlanWithOpenAI } from './services/geminiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, ContentPlanResult, Notification as NotificationType, VideoIdea, ProductionType } from './types';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import ApiKeyModal from './components/ApiKeyModal';
import TrainAiModal from './components/TrainAiModal';
import { BookmarkIcon, PaintBrushIcon } from './components/icons/Icons';
import InitialSuggestions from './components/InitialSuggestions';
import PasswordModal from './components/PasswordModal';
import ContentPlanModal from './components/ContentPlanModal';
import ChannelPlanModal from './components/ChannelPlanModal';
import ErrorModal from './components/ErrorModal';
import NotificationCenter from './components/NotificationCenter';
import LibraryModal from './components/LibraryModal';
import Auth from './components/Auth';
import { keyFindingTranscript, nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from './data/knowledgeBase';
import { exportVideoIdeasToTxt, exportNicheToTxt } from './utils/export';
import { themes, Theme } from './theme';

export type ApiKeyStatus = 'idle' | 'checking' | 'valid' | 'invalid';

async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: base64EncodedData, mimeType: file.type } };
}

const FilterDropdown: React.FC<{ label: string; value: FilterLevel; onChange: (value: FilterLevel) => void; disabled: boolean; tooltipText: string; theme: Theme; }> = ({ label, value, onChange, disabled, tooltipText, theme }) => (
    <div className="relative group">
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value as FilterLevel)} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${theme.focusRing} ${theme.border} outline-none transition-all duration-300`} disabled={disabled}>
            <option value="all">Tất cả</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung Bình</option>
            <option value="high">Cao</option>
        </select>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {tooltipText}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
        </div>
    </div>
);

const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const defaultTrainingHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: `Kiến thức tìm ki ngon:\n${keyFindingTranscript}` }] },
    { role: 'model', parts: [{ text: 'Đã nhớ cách tìm từ khóa.' }] },
    { role: 'user', parts: [{ text: `Kho kiến thức ngách:\n${nicheKnowledgeBase}` }] },
    { role: 'model', parts: [{ text: 'Đã tiếp thu kho ngách.' }] },
    { role: 'model', parts: [{ text: 'Chào bạn, tôi là AI phân tích ngách YouTube Gemini 3 Pro. Bạn cần hỗ trợ gì?'}] }
];

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<{ title: string; body: React.ReactNode; actionText?: string; onAction?: () => void; } | null>(null);
  const [targetMarket, setTargetMarket] = useState<string>('Quốc tế');
  const [customMarket, setCustomMarket] = useState<string>('');
  const [productionType, setProductionType] = useState<ProductionType>('faceless');
  const [analysisDepth, setAnalysisDepth] = useState<number>(0);
  const [savedNiches, setSavedNiches] = useState<Niche[]>([]);
  const [numResults, setNumResults] = useState<string>('5');
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>("ví dụ: 'Khám phá không gian'");
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [analysisType, setAnalysisType] = useState<'direct' | 'related'>('related');
  const [theme, setTheme] = useState<string>('teal');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [interestLevel, setInterestLevel] = useState<FilterLevel>('all');
  const [monetizationLevel, setMonetizationLevel] = useState<FilterLevel>('all');
  const [competitionLevel, setCompetitionLevel] = useState<FilterLevel>('all');
  const [sustainabilityLevel, setSustainabilityLevel] = useState<FilterLevel>('all');
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [openAiApiKeys, setOpenAiApiKeys] = useState<string[]>([]);
  const [openAiApiKeyStatuses, setOpenAiApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isTrainAiModalOpen, setIsTrainAiModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [trainingChatHistory, setTrainingChatHistory] = useState<ChatMessage[]>([]);
  const [isTrainingLoading, setIsTrainingLoading] = useState<boolean>(false);
  const [trainingPassword, setTrainingPassword] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'login' | 'change'>('login');
  const [contentPlan, setContentPlan] = useState<ContentPlanResult | null>(null);
  const [isContentPlanModalOpen, setIsContentPlanModalOpen] = useState<boolean>(false);
  const [generatingNiches, setGeneratingNiches] = useState<Set<string>>(new Set());
  const [generatingVideoIdeas, setGeneratingVideoIdeas] = useState<Set<string>>(new Set());
  const [activeNicheForContentPlan, setActiveNicheForContentPlan] = useState<Niche | null>(null);
  const [isContentPlanLoadingMore, setIsContentPlanLoadingMore] = useState<boolean>(false);
  const [generatingChannelPlan, setGeneratingChannelPlan] = useState<Set<string>>(new Set());
  const [isChannelPlanModalOpen, setIsChannelPlanModalOpen] = useState<boolean>(false);
  const [channelPlanContent, setChannelPlanContent] = useState<string | null>(null);
  const [activeNicheForChannelPlan, setActiveNicheForChannelPlan] = useState<Niche | null>(null);
  const [channelPlanCache, setChannelPlanCache] = useState<Record<string, string>>({});
  const [isGeneratingMoreDetailedPlan, setIsGeneratingMoreDetailedPlan] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const currentTheme = themes[theme] || themes.teal;

  const markets = ['Quốc tế', 'US/Canada', 'Anh', 'Úc', 'Đức', 'Pháp', 'Việt Nam', 'Nhật', 'Hàn', 'Custom'];
  const productionTypes = [
    { value: 'faceless', label: 'Faceless (Ẩn mặt)' },
    { value: 'personal', label: 'Personal (Lộ mặt)' },
    { value: 'factory', label: 'Factory (Xưởng nội dung)' }
  ];

  const checkAndSetAllApiKeys = async (geminiKeys: string[], openaiKeys: string[]) => {
      if (geminiKeys.length > 0) {
        setApiKeyStatuses(geminiKeys.map(() => 'checking'));
        const results = await Promise.all(geminiKeys.map(k => validateApiKey(k)));
        setApiKeyStatuses(results.map(v => v ? 'valid' : 'invalid'));
      }
      if (openaiKeys.length > 0) {
        setOpenAiApiKeyStatuses(openaiKeys.map(() => 'checking'));
        const results = await Promise.all(openaiKeys.map(k => validateOpenAiApiKey(k)));
        setOpenAiApiKeyStatuses(results.map(v => v ? 'valid' : 'invalid'));
      }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsAuthChecked(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (_event === 'SIGNED_OUT') { setApiKeys([]); setOpenAiApiKeys([]); setSavedNiches([]); setTrainingChatHistory(defaultTrainingHistory); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthChecked) return;
    const suggestionsPool = parseKnowledgeBaseForSuggestions(nicheKnowledgeBase);
    const placeholderSuggestions = shuffleArray(suggestionsPool).slice(0, 3);
    setSearchPlaceholder(`ví dụ: '${placeholderSuggestions[0]}', '${placeholderSuggestions[1]}'`);
    setTrainingPassword(localStorage.getItem('trainingPassword') || '111000');
  }, [isAuthChecked]);
  
  const runAnalysis = async (idea: string, isNewSearch: boolean, isLoadMore: boolean = false) => {
    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && !apiKeys.some((_, i) => apiKeyStatuses[i] === 'valid')) return setError({ title: 'Yêu cầu API Key', body: 'Vui lòng cấu hình API Key Gemini hợp lệ.', actionText: 'Cài đặt', onAction: () => setIsApiKeyModalOpen(true) });
    if (!idea.trim()) return;

    if (isLoadMore) setIsLoadingMore(true); else { setIsLoading(true); setAnalysisResult(null); }
    setError(null); setUserInput(idea); if (isNewSearch) setAnalysisDepth(0);
  
    const market = targetMarket === 'Custom' ? customMarket : targetMarket;
    try {
      let result: AnalysisResult;
      if (analysisType === 'direct' && !isLoadMore) {
        if (isGemini) ({ result } = await analyzeKeywordDirectly(idea, market, apiKeys, trainingChatHistory, (i) => {}, productionType));
        else throw new Error("Chưa hỗ trợ OpenAI cho mô hình này.");
      } else { 
        const options = { countToGenerate: parseInt(numResults), productionType, filters: { interest: interestLevel, monetization: monetizationLevel, competition: competitionLevel, sustainability: sustainabilityLevel } };
        if (isGemini) ({ result } = await analyzeNicheIdea(idea, market, apiKeys, trainingChatHistory, options, (i) => {}));
        else throw new Error("Chưa hỗ trợ OpenAI cho mô hình này.");
      }
      setAnalysisResult(prev => isLoadMore && prev ? { niches: [...prev.niches, ...result.niches] } : result);
      setAnalysisDepth(p => isNewSearch ? 1 : p + 1);
    } catch (err: any) { setError({ title: 'Lỗi', body: err.message }); } finally { setIsLoading(false); setIsLoadingMore(false); }
  };

  const handleAnalysis = () => runAnalysis(userInput, true);
  const handleDevelopIdea = (idea: string) => runAnalysis(idea, false);
  const handleLoadMore = () => runAnalysis(userInput, false, true);

  if (!isAuthChecked) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader /></div>;

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
      <NotificationCenter notifications={notifications} onRemove={(id) => setNotifications(p => p.filter(n => n.id !== id))} />
      <header className="absolute top-0 right-0 p-4 z-10 flex items-center gap-2">
        <Auth session={session} theme={currentTheme} />
        <button onClick={() => setIsLibraryModalOpen(true)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm"><BookmarkIcon /></button>
        <button onClick={() => setIsApiKeyModalOpen(true)} className="px-4 py-2 bg-teal-600 rounded-md text-sm font-bold">API</button>
      </header>
      
      <main className="container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="max-w-4xl w-full text-center space-y-8">
          <h1 className="text-4xl font-bold">YouTube Niche Finder <span className={`bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>AI</span></h1>
          <p className="text-gray-400">Hệ thống phân tích YouTube sử dụng Gemini 3 Pro để tối ưu hóa ngách theo mô hình sản xuất của bạn.</p>

          <SearchBar userInput={userInput} setUserInput={setUserInput} handleAnalysis={handleAnalysis} isLoading={isLoading} placeholder={searchPlaceholder} theme={currentTheme} />
          
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mô hình sản xuất</label>
                <select value={productionType} onChange={(e) => setProductionType(e.target.value as ProductionType)} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${currentTheme.focusRing}`}>
                  {productionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Thị trường</label>
                <select value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${currentTheme.focusRing}`}>
                  {markets.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">AI Model</label>
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${currentTheme.focusRing}`}>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Số kết quả</label>
                <select value={numResults} onChange={(e) => setNumResults(e.target.value)} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${currentTheme.focusRing}`}>
                  <option value="5">5</option><option value="10">10</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <FilterDropdown label="Quan tâm" value={interestLevel} onChange={setInterestLevel} disabled={isLoading} tooltipText="Khối lượng tìm kiếm" theme={currentTheme}/>
               <FilterDropdown label="Kiếm tiền" value={monetizationLevel} onChange={setMonetizationLevel} disabled={isLoading} tooltipText="RPM dự kiến" theme={currentTheme}/>
               <FilterDropdown label="Cạnh tranh" value={competitionLevel} onChange={setCompetitionLevel} disabled={isLoading} tooltipText="Độ khó để leo rank" theme={currentTheme}/>
               <FilterDropdown label="Bền vững" value={sustainabilityLevel} onChange={setSustainabilityLevel} disabled={isLoading} tooltipText="Tính evergreen" theme={currentTheme}/>
            </div>
          </div>

          <button onClick={handleAnalysis} disabled={isLoading} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${currentTheme.bg} ${currentTheme.bgHover} disabled:opacity-50`}>
            {isLoading ? 'Đang phân tích...' : 'Phân Tích Ý Tưởng'}
          </button>

          <div ref={suggestionsRef}>
            {isLoading ? <Loader /> : analysisResult ? (
              <ResultsDisplay 
                result={analysisResult} 
                onDevelop={handleDevelopIdea}
                analysisDepth={analysisDepth}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                savedNiches={savedNiches}
                onUseNiche={(n) => {}}
                onViewPlan={(n) => {}}
                generatingNiches={generatingNiches}
                numResults={numResults}
                onGenerateVideoIdeas={(n) => {}}
                generatingVideoIdeas={generatingVideoIdeas}
                onExportVideoIdeas={() => {}}
                onExportNiche={() => {}}
                isDirectAnalysis={analysisType === 'direct'}
                theme={theme}
                onGenerateChannelPlan={(n) => {}}
                generatingChannelPlan={generatingChannelPlan}
                channelPlanCache={channelPlanCache}
              />
            ) : <InitialSuggestions setUserInput={setUserInput} theme={theme} />}
          </div>
        </div>
      </main>
      
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} onSaveAndCheckGemini={async (keys) => { setApiKeys(keys); await checkAndSetAllApiKeys(keys, openAiApiKeys); }} onSaveAndCheckOpenAI={async (keys) => { setOpenAiApiKeys(keys); await checkAndSetAllApiKeys(apiKeys, keys); }} onRecheckAll={() => checkAndSetAllApiKeys(apiKeys, openAiApiKeys)} onDeleteKey={(i) => setApiKeys(p => p.filter((_, idx) => idx !== i))} onDeleteOpenAiKey={(i) => setOpenAiApiKeys(p => p.filter((_, idx) => idx !== i))} currentApiKeys={apiKeys} activeApiKeyIndex={null} apiKeyStatuses={apiKeyStatuses} currentOpenAiApiKeys={openAiApiKeys} openAiApiKeyStatuses={openAiApiKeyStatuses} activeOpenAiApiKeyIndex={null} theme={theme} />
      <LibraryModal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} savedNiches={savedNiches} onDeleteNiche={() => {}} onDeleteAll={() => {}} onExport={() => {}} onImport={() => {}} onUseNiche={(n) => { setUserInput(n.niche_name.original); handleAnalysis(); }} onViewChannelPlan={() => {}} theme={theme} />
      <ErrorModal isOpen={!!error} onClose={() => setError(null)} title={error?.title || 'Lỗi'} theme={theme}>{error?.body}</ErrorModal>
    </div>
  );
};

export default App;
