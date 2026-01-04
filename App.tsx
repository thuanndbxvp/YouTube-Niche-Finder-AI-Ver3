
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, developVideoIdeas, generateVideoIdeasForNiche, analyzeKeywordDirectly, generateChannelPlan, validateApiKey, validateOpenAiApiKey } from './services/geminiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, Notification as NotificationType, ProductionType } from './types';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import TrainAiModal from './components/TrainAiModal';
import ApiKeyModal from './components/ApiKeyModal';
import { BookmarkIcon, BrainIcon, KeyIcon } from './components/icons/Icons';
import InitialSuggestions from './components/InitialSuggestions';
import PasswordModal from './components/PasswordModal';
import ChannelPlanModal from './components/ChannelPlanModal';
import ErrorModal from './components/ErrorModal';
import NotificationCenter from './components/NotificationCenter';
import LibraryModal from './components/LibraryModal';
import Auth from './components/Auth';
import { keyFindingTranscript, nicheKnowledgeBase, parseKnowledgeBaseForSuggestions } from './data/knowledgeBase';
import { exportNicheToTxt } from './utils/export';
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
  const [numResults, setNumResults] = useState<string>('5');
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>("ví dụ: 'Khám phá không gian'");
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [analysisType, setAnalysisType] = useState<'direct' | 'related'>('related');
  const [theme, setTheme] = useState<string>('teal');
  const [interestLevel, setInterestLevel] = useState<FilterLevel>('all');
  const [monetizationLevel, setMonetizationLevel] = useState<FilterLevel>('all');
  const [competitionLevel, setCompetitionLevel] = useState<FilterLevel>('all');
  const [sustainabilityLevel, setSustainabilityLevel] = useState<FilterLevel>('all');
  
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('yt_finder_gemini_keys');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAiApiKeys, setOpenAiApiKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('yt_finder_openai_keys');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedNiches, setSavedNiches] = useState<Niche[]>(() => {
    const saved = localStorage.getItem('yt_finder_saved_niches');
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKeyStatuses, setApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [openAiApiKeyStatuses, setOpenAiApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isTrainAiModalOpen, setIsTrainAiModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [isChannelPlanModalOpen, setIsChannelPlanModalOpen] = useState<boolean>(false);
  const [activePlanNiche, setActivePlanNiche] = useState<Niche | null>(null);
  
  const [trainingChatHistory, setTrainingChatHistory] = useState<ChatMessage[]>(defaultTrainingHistory);
  const [isTrainingLoading, setIsTrainingLoading] = useState<boolean>(false);
  const [trainingPassword, setTrainingPassword] = useState<string>('111000');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordModalMode, setPasswordModalMode] = useState<'login' | 'change'>('login');
  
  const [channelPlanCache, setChannelPlanCache] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('yt_finder_channel_plans');
    return saved ? JSON.parse(saved) : {};
  });
  const [generatingChannelPlan, setGeneratingChannelPlan] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
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
      } else {
        setApiKeyStatuses([]);
      }
      
      if (openaiKeys.length > 0) {
        setOpenAiApiKeyStatuses(openaiKeys.map(() => 'checking'));
        const results = await Promise.all(openaiKeys.map(k => validateOpenAiApiKey(k)));
        setOpenAiApiKeyStatuses(results.map(v => v ? 'valid' : 'invalid'));
      } else {
        setOpenAiApiKeyStatuses([]);
      }
  };

  useEffect(() => { localStorage.setItem('yt_finder_gemini_keys', JSON.stringify(apiKeys)); }, [apiKeys]);
  useEffect(() => { localStorage.setItem('yt_finder_openai_keys', JSON.stringify(openAiApiKeys)); }, [openAiApiKeys]);
  useEffect(() => { localStorage.setItem('yt_finder_saved_niches', JSON.stringify(savedNiches)); }, [savedNiches]);
  useEffect(() => { localStorage.setItem('yt_finder_channel_plans', JSON.stringify(channelPlanCache)); }, [channelPlanCache]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsAuthChecked(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (_event === 'SIGNED_OUT') { setApiKeys([]); setOpenAiApiKeys([]); setSavedNiches([]); setTrainingChatHistory(defaultTrainingHistory); } });
    const savedPass = localStorage.getItem('trainingPassword');
    if (savedPass) setTrainingPassword(savedPass);
    
    // Check keys on load
    if (apiKeys.length > 0 || openAiApiKeys.length > 0) {
      checkAndSetAllApiKeys(apiKeys, openAiApiKeys);
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthChecked) return;
    const suggestionsPool = parseKnowledgeBaseForSuggestions(nicheKnowledgeBase);
    const placeholderSuggestions = shuffleArray(suggestionsPool).slice(0, 3);
    setSearchPlaceholder(`ví dụ: '${placeholderSuggestions[0]}', '${placeholderSuggestions[1]}'`);
  }, [isAuthChecked]);

  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotifications(prev => [{ id, message, type }, ...prev]);
  };

  const handleToggleSaveNiche = (niche: Niche) => {
    const isAlreadySaved = savedNiches.some(s => s.niche_name.original === niche.niche_name.original);
    if (isAlreadySaved) {
      setSavedNiches(prev => prev.filter(s => s.niche_name.original !== niche.niche_name.original));
      addNotification(`Đã xóa "${niche.niche_name.original}" khỏi thư viện`, 'success');
    } else {
      setSavedNiches(prev => [niche, ...prev]);
      addNotification(`Đã lưu "${niche.niche_name.original}" vào thư viện`, 'success');
    }
  };

  const handleDeleteNiche = (nicheName: string) => {
    setSavedNiches(prev => prev.filter(n => n.niche_name.original !== nicheName));
  };
  
  const handleGenerateChannelPlan = async (niche: Niche, detailed: boolean = false) => {
    if (!apiKeys.some((_, i) => apiKeyStatuses[i] === 'valid')) {
        return setError({ 
            title: 'Yêu cầu API Key', 
            body: 'Vui lòng nhập ít nhất một API Key Gemini hợp lệ để sử dụng tính năng này.', 
            actionText: 'Cài đặt Key', 
            onAction: () => setIsApiKeyModalOpen(true) 
        });
    }

    const nicheName = niche.niche_name.original;
    
    if (channelPlanCache[nicheName] && !detailed) {
        setActivePlanNiche(niche);
        setIsChannelPlanModalOpen(true);
        return;
    }

    setGeneratingChannelPlan(prev => new Set(prev).add(nicheName));
    try {
        const result = await generateChannelPlan(niche, apiKeys, trainingChatHistory, { isMoreDetailed: detailed });
        setChannelPlanCache(prev => ({ ...prev, [nicheName]: result }));
        setActivePlanNiche(niche);
        setIsChannelPlanModalOpen(true);
        addNotification(detailed ? "Đã cập nhật kế hoạch chi tiết!" : "Đã tạo kế hoạch xây kênh thành công!", "success");
    } catch (err: any) {
        setError({ title: "Lỗi tạo kế hoạch", body: err.message });
    } finally {
        setGeneratingChannelPlan(prev => {
            const next = new Set(prev);
            next.delete(nicheName);
            return next;
        });
    }
  };

  const handleTrainAiMessage = async (message: string, files: File[]) => {
    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && !apiKeys.some((_, i) => apiKeyStatuses[i] === 'valid')) {
        return setError({ title: 'Yêu cầu API Key', body: 'Cần ít nhất một API Key Gemini hợp lệ để huấn luyện.', actionText: 'Cài đặt', onAction: () => setIsApiKeyModalOpen(true) });
    }

    setIsTrainingLoading(true);
    const fileParts = await Promise.all(files.map(fileToGenerativePart));
    const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: message }, ...fileParts] };
    const updatedHistory = [...trainingChatHistory, newUserMessage];
    setTrainingChatHistory(updatedHistory);

    try {
        const aiResponse = await getTrainingResponse(updatedHistory, apiKeys);
        setTrainingChatHistory(prev => [...prev, { role: 'model', parts: [{ text: aiResponse }] }]);
    } catch (err: any) {
        setError({ title: 'Lỗi huấn luyện', body: err.message });
    } finally {
        setIsTrainingLoading(false);
    }
  };

  const runAnalysis = async (idea: string, isNewSearch: boolean, isLoadMore: boolean = false) => {
    if (selectedModel.startsWith('gemini') && !apiKeys.some((_, i) => apiKeyStatuses[i] === 'valid')) {
        return setError({ title: 'Yêu cầu API Key', body: 'Vui lòng cấu hình API Key Gemini hợp lệ.', actionText: 'Cài đặt', onAction: () => setIsApiKeyModalOpen(true) });
    }
    if (!idea.trim()) return;

    if (isLoadMore) setIsLoadingMore(true); else { setIsLoading(true); setAnalysisResult(null); }
    setError(null); setUserInput(idea); if (isNewSearch) setAnalysisDepth(0);
  
    const market = targetMarket === 'Custom' ? customMarket : targetMarket;
    try {
      let result: AnalysisResult;
      if (analysisType === 'direct' && !isLoadMore) {
        result = await analyzeKeywordDirectly(idea, market, apiKeys, trainingChatHistory, productionType);
      } else { 
        const options = { countToGenerate: parseInt(numResults), productionType, filters: { interest: interestLevel, monetization: monetizationLevel, competition: competitionLevel, sustainability: sustainabilityLevel } };
        result = await analyzeNicheIdea(idea, market, apiKeys, trainingChatHistory, options);
      }
      setAnalysisResult(prev => isLoadMore && prev ? { niches: [...prev.niches, ...result.niches] } : result);
      setAnalysisDepth(p => isNewSearch ? 1 : p + 1);
    } catch (err: any) { 
        setError({ title: 'Lỗi', body: err.message }); 
    } finally { 
      setIsLoading(false); 
      setIsLoadingMore(false); 
    }
  };

  const handleAnalysis = () => runAnalysis(userInput, true);

  if (!isAuthChecked) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader /></div>;

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
      <NotificationCenter notifications={notifications} onRemove={(id) => setNotifications(p => p.filter(n => n.id !== id))} />
      <header className="absolute top-0 right-0 p-4 z-10 flex items-center gap-2">
        <Auth session={session} theme={currentTheme} />
        <button onClick={() => { setPasswordModalMode('login'); setIsPasswordModalOpen(true); }} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm hover:bg-gray-700 transition-colors flex items-center gap-2">
            <BrainIcon /> <span className="hidden md:inline">Train AI Tool</span>
        </button>
        <button onClick={() => setIsLibraryModalOpen(true)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm relative">
          <BookmarkIcon />
          {savedNiches.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full text-white font-bold">{savedNiches.length}</span>}
        </button>
        <button onClick={() => setIsApiKeyModalOpen(true)} className="px-4 py-2 bg-teal-600 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-teal-500 transition-colors">
          <KeyIcon /> <span>Cấu hình API</span>
        </button>
      </header>
      
      <main className="container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="max-w-4xl w-full text-center space-y-8">
          <h1 className="text-4xl font-bold">YouTube Niche Finder <span className={`bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>AI</span></h1>
          <p className="text-gray-400">Hệ thống phân tích YouTube sử dụng Gemini 3 Pro để tối ưu hóa ngách theo mô hình sản xuất của bạn.</p>

          <SearchBar userInput={userInput} setUserInput={setUserInput} handleAnalysis={handleAnalysis} isLoading={isLoading} placeholder={searchPlaceholder} theme={currentTheme} />
          
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-6 text-left">
            <div className="flex items-center justify-center gap-8 py-2 border-b border-gray-700/50">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="analysisType" checked={analysisType === 'related'} onChange={() => setAnalysisType('related')} className={`w-4 h-4 ${currentTheme.radio} bg-gray-700 border-gray-600`} />
                <span className={`text-sm font-medium transition-colors ${analysisType === 'related' ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>Tìm chủ đề liên quan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="analysisType" checked={analysisType === 'direct'} onChange={() => setAnalysisType('direct')} className={`w-4 h-4 ${currentTheme.radio} bg-gray-700 border-gray-600`} />
                <span className={`text-sm font-medium transition-colors ${analysisType === 'direct' ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>Phân tích key này</span>
              </label>
            </div>

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

          <div>
            {isLoading ? <Loader /> : analysisResult ? (
              <ResultsDisplay 
                result={analysisResult} 
                onDevelop={(idea) => runAnalysis(idea, false)}
                analysisDepth={analysisDepth}
                onLoadMore={() => runAnalysis(userInput, false, true)}
                isLoadingMore={isLoadingMore}
                savedNiches={savedNiches}
                onUseNiche={handleToggleSaveNiche}
                onViewPlan={() => {}}
                generatingNiches={new Set()}
                numResults={numResults}
                onGenerateVideoIdeas={() => {}}
                generatingVideoIdeas={new Set()}
                onExportVideoIdeas={() => {}}
                onExportNiche={(n) => exportNicheToTxt(n)}
                isDirectAnalysis={analysisType === 'direct'}
                theme={theme}
                onGenerateChannelPlan={handleGenerateChannelPlan}
                generatingChannelPlan={generatingChannelPlan}
                channelPlanCache={channelPlanCache}
              />
            ) : <InitialSuggestions setUserInput={setUserInput} theme={theme} />}
          </div>
        </div>
      </main>
      
      <ChannelPlanModal 
        isOpen={isChannelPlanModalOpen} 
        onClose={() => setIsChannelPlanModalOpen(false)} 
        planContent={activePlanNiche ? channelPlanCache[activePlanNiche.niche_name.original] : null} 
        activeNiche={activePlanNiche} 
        theme={theme} 
        onGenerateMoreDetailedPlan={() => activePlanNiche && handleGenerateChannelPlan(activePlanNiche, true)} 
        isLoadingMore={activePlanNiche ? generatingChannelPlan.has(activePlanNiche.niche_name.original) : false} 
      />
      
      <TrainAiModal isOpen={isTrainAiModalOpen} onClose={() => setIsTrainAiModalOpen(false)} chatHistory={trainingChatHistory} onSendMessage={handleTrainAiMessage} isLoading={isTrainingLoading} onChangePassword={() => { setPasswordModalMode('change'); setIsPasswordModalOpen(true); }} selectedModel={selectedModel} theme={theme} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} verifyPassword={(p) => p === trainingPassword} mode={passwordModalMode} theme={theme} onSuccess={(newPass) => { if (passwordModalMode === 'login') { setIsPasswordModalOpen(false); setIsTrainAiModalOpen(true); } else if (newPass) { setTrainingPassword(newPass); localStorage.setItem('trainingPassword', newPass); setIsPasswordModalOpen(false); } }} />
      <ApiKeyModal 
          isOpen={isApiKeyModalOpen} 
          onClose={() => setIsApiKeyModalOpen(false)} 
          onSaveAndCheckGemini={async (keys) => { setApiKeys(keys); await checkAndSetAllApiKeys(keys, openAiApiKeys); }} 
          onSaveAndCheckOpenAI={async (keys) => { setOpenAiApiKeys(keys); await checkAndSetAllApiKeys(apiKeys, keys); }} 
          onRecheckAll={() => checkAndSetAllApiKeys(apiKeys, openAiApiKeys)} 
          onDeleteKey={(i) => setApiKeys(p => p.filter((_, idx) => idx !== i))} 
          onDeleteOpenAiKey={(i) => setOpenAiApiKeys(p => p.filter((_, idx) => idx !== i))} 
          currentApiKeys={apiKeys} 
          activeApiKeyIndex={null} 
          apiKeyStatuses={apiKeyStatuses} 
          currentOpenAiApiKeys={openAiApiKeys} 
          openAiApiKeyStatuses={openAiApiKeyStatuses} 
          activeOpenAiApiKeyIndex={null} 
          theme={theme} 
      />
      <LibraryModal 
        isOpen={isLibraryModalOpen} 
        onClose={() => setIsLibraryModalOpen(false)} 
        savedNiches={savedNiches} 
        onDeleteNiche={handleDeleteNiche} 
        onDeleteAll={() => { if(confirm("Xóa tất cả thư viện?")) setSavedNiches([]); }} 
        onExport={() => {
          const blob = new Blob([JSON.stringify(savedNiches, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'youtube_niches_library.json';
          a.click();
        }} 
        onImport={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const imported = JSON.parse(e.target?.result as string);
              if (Array.isArray(imported)) {
                setSavedNiches(prev => {
                  const combined = [...prev, ...imported];
                  return combined.filter((v, i, a) => a.findIndex(t => (t.niche_name.original === v.niche_name.original)) === i);
                });
                addNotification("Đã nhập thư viện thành công", 'success');
              }
            } catch (err) { addNotification("Lỗi file không hợp lệ", 'error'); }
          };
          reader.readAsText(file);
        }} 
        onUseNiche={(n) => { setUserInput(n.niche_name.original); handleAnalysis(); setIsLibraryModalOpen(false); }} 
        onViewChannelPlan={(n) => handleGenerateChannelPlan(n)} 
        theme={theme} 
      />
      <ErrorModal isOpen={!!error} onClose={() => setError(null)} title={error?.title || 'Lỗi'} theme={theme} actionText={error?.actionText} onAction={error?.onAction}>{error?.body}</ErrorModal>
    </div>
  );
};

export default App;
