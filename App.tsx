

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { analyzeNicheIdea, getTrainingResponse, generateContentPlan, validateApiKey, developVideoIdeas, generateVideoIdeasForNiche, validateOpenAiApiKey, analyzeNicheIdeaWithOpenAI, generateVideoIdeasForNicheWithOpenAI, developVideoIdeasWithOpenAI, generateContentPlanWithOpenAI, analyzeKeywordDirectly, analyzeKeywordDirectlyWithOpenAI, getTrainingResponseWithOpenAI, generateChannelPlan, generateChannelPlanWithOpenAI } from './services/geminiService';
import type { AnalysisResult, ChatMessage, Part, Niche, FilterLevel, ContentPlanResult, Notification as NotificationType, VideoIdea } from './types';
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
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

const FilterDropdown: React.FC<{
    label: string;
    value: FilterLevel;
    onChange: (value: FilterLevel) => void;
    disabled: boolean;
    tooltipText: string;
    theme: Theme;
}> = ({ label, value, onChange, disabled, tooltipText, theme }) => (
    <div className="relative group">
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as FilterLevel)}
            className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 ${theme.focusRing} ${theme.border} outline-none transition-all duration-300`}
            disabled={disabled}
        >
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
    { role: 'user', parts: [{ text: `Hãy ghi nhớ và học hỏi kiến thức sau đây về cách tìm và đánh giá từ khóa (key) trên YouTube. Đây là kiến thức nền tảng bạn phải sử dụng cho mọi phân tích trong tương lai.\n\n--- BẮT ĐẦU KIẾN THỨC ---\n\n${keyFindingTranscript}\n\n--- KẾT THÚC KIẾN THỨC ---` }] },
    { role: 'model', parts: [{ text: 'Cảm ơn bạn. Tôi đã tiếp thu và ghi nhớ kiến thức về 5 phương pháp tìm kiếm và đánh giá từ khóa YouTube. Tôi sẽ áp dụng những chiến lược này vào các phân tích ngách trong tương lai để đưa ra kết quả chất lượng hơn.' }] },
    { role: 'user', parts: [{ text: `Tuyệt vời. Bây giờ, hãy tiếp tục học hỏi cơ sở kiến thức sau đây về hàng trăm ngách và chủ đề YouTube tiềm năng. Đây là nguồn dữ liệu quan trọng để bạn đưa ra các đề xuất đa dạng và chính xác.\n\n--- BẮT ĐẦU CƠ SỞ KIẾN THỨC NGÁCH ---\n\n${nicheKnowledgeBase}\n\n--- KẾT THÚC CƠ SỞ KIẾN THỨC NGÁCH ---` }] },
    { role: 'model', parts: [{ text: 'Cảm ơn bạn. Tôi đã tiếp thu và ghi nhớ cơ sở kiến thức toàn diện về các ngách YouTube. Tôi sẽ sử dụng thông tin này để làm giàu và cải thiện độ chính xác cho các phân tích và đề xuất của mình.' }] },
    { role: 'model', parts: [{ text: 'Chào bạn, tôi là AI phân tích ngách YouTube, đã được trang bị kiến thức chuyên sâu. Bạn có thể cung cấp thêm cho tôi bất kỳ kiến thức, tài liệu, hoặc văn bản nào để tôi học hỏi thêm, hoặc bắt đầu tìm kiếm ý tưởng ngách ngay bây giờ.'}] }
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
  const [analysisDepth, setAnalysisDepth] = useState<number>(0);
  const [savedNiches, setSavedNiches] = useState<Niche[]>([]);
  const [numResults, setNumResults] = useState<string>('5');
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>("ví dụ: 'Khám phá không gian', 'Dự án DIY tại nhà', 'Nấu ăn'");
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-pro');
  const [analysisType, setAnalysisType] = useState<'direct' | 'related'>('related');
  const [theme, setTheme] = useState<string>('teal');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  // Filters
  const [interestLevel, setInterestLevel] = useState<FilterLevel>('all');
  const [monetizationLevel, setMonetizationLevel] = useState<FilterLevel>('all');
  const [competitionLevel, setCompetitionLevel] = useState<FilterLevel>('all');
  const [sustainabilityLevel, setSustainabilityLevel] = useState<FilterLevel>('all');

  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [apiKeyStatuses, setApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number | null>(null);
  
  const [openAiApiKeys, setOpenAiApiKeys] = useState<string[]>([]);
  const [openAiApiKeyStatuses, setOpenAiApiKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [activeOpenAiApiKeyIndex, setActiveOpenAiApiKeyIndex] = useState<number | null>(null);

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
  const [contentPlanCache, setContentPlanCache] = useState<Record<string, ContentPlanResult>>({});
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

  const checkAndSetAllApiKeys = async (geminiKeys: string[], openaiKeys: string[]) => {
      // Gemini
      if (geminiKeys.length > 0) {
        setApiKeyStatuses(geminiKeys.map(() => 'checking'));
        const geminiValidationPromises = geminiKeys.map(key => validateApiKey(key));
        const geminiResults = await Promise.all(geminiValidationPromises);
        const geminiFinalStatuses = geminiResults.map(isValid => (isValid ? 'valid' : 'invalid'));
        setApiKeyStatuses(geminiFinalStatuses);
        if (!session) localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(geminiFinalStatuses));
      } else {
        setApiKeyStatuses([]);
        if (!session) localStorage.setItem('geminiApiKeyStatuses', JSON.stringify([]));
      }
      
      // OpenAI
      if (openaiKeys.length > 0) {
        setOpenAiApiKeyStatuses(openaiKeys.map(() => 'checking'));
        const openaiValidationPromises = openaiKeys.map(key => validateOpenAiApiKey(key));
        const openaiResults = await Promise.all(openaiValidationPromises);
        const openaiFinalStatuses = openaiResults.map(isValid => (isValid ? 'valid' : 'invalid'));
        setOpenAiApiKeyStatuses(openaiFinalStatuses);
        if (!session) localStorage.setItem('openAiApiKeyStatuses', JSON.stringify(openaiFinalStatuses));
      } else {
        setOpenAiApiKeyStatuses([]);
        if (!session) localStorage.setItem('openAiApiKeyStatuses', JSON.stringify([]));
      }
  };

  const loadDataFromLocalStorage = () => {
    try {
        const storedApiKeys = localStorage.getItem('geminiApiKeys');
        if (storedApiKeys) setApiKeys(JSON.parse(storedApiKeys));
        const storedStatuses = localStorage.getItem('geminiApiKeyStatuses');
        if (storedStatuses) setApiKeyStatuses(JSON.parse(storedStatuses));

        const storedOpenAiKeys = localStorage.getItem('openAiApiKeys');
        if (storedOpenAiKeys) setOpenAiApiKeys(JSON.parse(storedOpenAiKeys));
        const storedOpenAiStatuses = localStorage.getItem('openAiApiKeyStatuses');
        if (storedOpenAiStatuses) setOpenAiApiKeyStatuses(JSON.parse(storedOpenAiStatuses));

        const storedNiches = localStorage.getItem('savedNiches');
        if (storedNiches) setSavedNiches(JSON.parse(storedNiches));

        const storedTrainingHistory = localStorage.getItem('trainingChatHistory');
        setTrainingChatHistory(storedTrainingHistory ? JSON.parse(storedTrainingHistory) : defaultTrainingHistory);
        
        const storedTheme = localStorage.getItem('appTheme');
        if (storedTheme && themes[storedTheme]) setTheme(storedTheme);

    } catch (e) {
        console.error("Error loading data from localStorage", e);
    }
  };

  const loadDataFromSupabase = async () => {
      if (!session) return;
      try {
          // Check for profile and create if it doesn't exist (for new users)
          let { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('theme')
              .eq('id', session.user.id)
              .single();
          
          if (profileError && profileError.code === 'PGRST116') {
              // New user detected. Create their profile with default theme.
              const { error: insertError } = await supabase.from('profiles').insert({ 
                  id: session.user.id, 
                  theme: 'teal' 
              });
              if (insertError) throw insertError; // If profile creation fails, it's a critical error.
          } else if (profileError) {
              throw profileError; // Other errors are critical.
          } else if (profileData?.theme) {
              setTheme(profileData.theme); // Existing user, apply their saved theme.
          }

          // Now that the profile is guaranteed to exist, proceed to load other data.

          // API Keys
          const { data: keysData, error: keysError } = await supabase
              .from('api_keys')
              .select('key_type, encrypted_key')
              .eq('user_id', session.user.id);
          if (keysError) throw keysError;
          const geminiKeys = keysData?.filter(k => k.key_type === 'gemini').map(k => k.encrypted_key) || [];
          const openaiKeys = keysData?.filter(k => k.key_type === 'openai').map(k => k.encrypted_key) || [];
          setApiKeys(geminiKeys);
          setOpenAiApiKeys(openaiKeys);
          await checkAndSetAllApiKeys(geminiKeys, openaiKeys);

          // Saved Niches
          const { data: nichesData, error: nichesError } = await supabase
              .from('saved_niches')
              .select('niche_data')
              .eq('user_id', session.user.id);
          if (nichesError) throw nichesError;
          setSavedNiches(nichesData?.map(n => n.niche_data) || []);

          // Training History
          const { data: trainingData, error: trainingError } = await supabase
              .from('training_history')
              .select('history_data')
              .eq('user_id', session.user.id)
              .single();
          
          // For training history, it's okay if it doesn't exist. Use default.
          if (trainingError && trainingError.code !== 'PGRST116') {
              throw trainingError;
          }
          setTrainingChatHistory(trainingData ? trainingData.history_data : defaultTrainingHistory);

      } catch (error: any) {
          console.error("Error loading data from Supabase:", error);
          setError({title: "Lỗi tải dữ liệu", body: "Không thể tải dữ liệu của bạn từ máy chủ. Vui lòng thử tải lại trang."});
      }
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        // Reset state to avoid showing previous user's data
        setApiKeys([]);
        setOpenAiApiKeys([]);
        setSavedNiches([]);
        setTrainingChatHistory(defaultTrainingHistory);
        setChannelPlanCache({});
        setContentPlanCache({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthChecked) return;

    const init = async () => {
        if (session) {
            await loadDataFromSupabase();
        } else {
            loadDataFromLocalStorage();
        }
    };
    init();

    // Placeholder and other initial setup
    const suggestionsPool = parseKnowledgeBaseForSuggestions(nicheKnowledgeBase);
    const shuffled = shuffleArray(suggestionsPool);
    const placeholderSuggestions = shuffled.slice(0, 3);
    setSearchPlaceholder(`ví dụ: '${placeholderSuggestions[0]}', '${placeholderSuggestions[1]}', '${placeholderSuggestions[2]}'`);
    
    const storedPassword = localStorage.getItem('trainingPassword');
    setTrainingPassword(storedPassword || 'Nhocyeu1');

    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [session?.user.id, isAuthChecked]);
  
  const handleSetTheme = async (newTheme: string) => {
    if (themes[newTheme]) {
      setTheme(newTheme);
      setIsThemeDropdownOpen(false);
      if (session) {
        // Use upsert to create a profile if it doesn't exist, or update it if it does.
        // This fixes the issue of settings not saving for new users.
        await supabase.from('profiles').upsert({ id: session.user.id, theme: newTheme });
      } else {
        localStorage.setItem('appTheme', newTheme);
      }
    }
  };
  
  const markets = ['Quốc tế', 'US/Canada', 'Anh', 'Úc', 'Đức', 'Pháp', 'Việt Nam', 'Nhật', 'Hàn', 'Custom'];

  const handleSaveAndCheckGeminiApiKeys = async (newApiKeys: string[]) => {
    setApiKeys(newApiKeys);
    if (session) {
      await supabase.from('api_keys').delete().match({ user_id: session.user.id, key_type: 'gemini' });
      if (newApiKeys.length > 0) {
        const newRecords = newApiKeys.map(key => ({ user_id: session.user.id, key_type: 'gemini', encrypted_key: key }));
        await supabase.from('api_keys').insert(newRecords);
      }
    } else {
      localStorage.setItem('geminiApiKeys', JSON.stringify(newApiKeys));
    }
    await checkAndSetAllApiKeys(newApiKeys, openAiApiKeys);
  };

  const handleSaveAndCheckOpenAiApiKeys = async (newApiKeys: string[]) => {
    setOpenAiApiKeys(newApiKeys);
    if (session) {
      await supabase.from('api_keys').delete().match({ user_id: session.user.id, key_type: 'openai' });
      if (newApiKeys.length > 0) {
        const newRecords = newApiKeys.map(key => ({ user_id: session.user.id, key_type: 'openai', encrypted_key: key }));
        await supabase.from('api_keys').insert(newRecords);
      }
    } else {
      localStorage.setItem('openAiApiKeys', JSON.stringify(newApiKeys));
    }
    await checkAndSetAllApiKeys(apiKeys, newApiKeys);
  };
  
  const handleDeleteApiKey = async (indexToDelete: number) => {
    const keyToDelete = apiKeys[indexToDelete];
    const newKeys = apiKeys.filter((_, i) => i !== indexToDelete);
    setApiKeys(newKeys);
    if (session) {
        await supabase.from('api_keys').delete().match({ user_id: session.user.id, key_type: 'gemini', encrypted_key: keyToDelete });
    } else {
        localStorage.setItem('geminiApiKeys', JSON.stringify(newKeys));
        const newStatuses = apiKeyStatuses.filter((_, i) => i !== indexToDelete);
        setApiKeyStatuses(newStatuses);
        localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(newStatuses));
    }
    if (activeApiKeyIndex === indexToDelete) setActiveApiKeyIndex(null);
    else if (activeApiKeyIndex !== null && indexToDelete < activeApiKeyIndex) setActiveApiKeyIndex(p => p === null ? null : p - 1);
  };

  const handleDeleteOpenAiApiKey = async (indexToDelete: number) => {
    const keyToDelete = openAiApiKeys[indexToDelete];
    const newKeys = openAiApiKeys.filter((_, i) => i !== indexToDelete);
    setOpenAiApiKeys(newKeys);
    if (session) {
        await supabase.from('api_keys').delete().match({ user_id: session.user.id, key_type: 'openai', encrypted_key: keyToDelete });
    } else {
        localStorage.setItem('openAiApiKeys', JSON.stringify(newKeys));
        const newStatuses = openAiApiKeyStatuses.filter((_, i) => i !== indexToDelete);
        setOpenAiApiKeyStatuses(newStatuses);
        localStorage.setItem('openAiApiKeyStatuses', JSON.stringify(newStatuses));
    }
    if (activeOpenAiApiKeyIndex === indexToDelete) setActiveOpenAiApiKeyIndex(null);
    else if (activeOpenAiApiKeyIndex !== null && indexToDelete < activeOpenAiApiKeyIndex) setActiveOpenAiApiKeyIndex(p => p === null ? null : p - 1);
  };

  const autoSaveOrUpdateNiches = async (processedNiches: Niche[]) => {
    if (!processedNiches || processedNiches.length === 0) return;

    const savedNichesMap = new Map(savedNiches.map(n => [n.niche_name.original, n]));
    const nichesToInsert: Niche[] = [];
    const nichesToUpdate: Niche[] = [];

    processedNiches.forEach(niche => {
      const existingNiche = savedNichesMap.get(niche.niche_name.original);
      if (existingNiche) {
        if (JSON.stringify(niche) !== JSON.stringify(existingNiche)) {
          nichesToUpdate.push(niche);
        }
      } else {
        nichesToInsert.push(niche);
      }
    });

    if (nichesToInsert.length === 0 && nichesToUpdate.length === 0) return;

    const updatedStateMap = new Map(savedNiches.map(n => [n.niche_name.original, n]));
    nichesToInsert.forEach(n => updatedStateMap.set(n.niche_name.original, n));
    nichesToUpdate.forEach(n => updatedStateMap.set(n.niche_name.original, n));
    const finalSavedNichesState = Array.from(updatedStateMap.values());
    setSavedNiches(finalSavedNichesState);

    if (session) {
      try {
        const insertPromise = nichesToInsert.length > 0
          ? supabase.from('saved_niches').insert(nichesToInsert.map(n => ({ user_id: session.user.id, niche_data: n })))
          : Promise.resolve();
        const updatePromises = nichesToUpdate.map(niche =>
          supabase.from('saved_niches')
            .update({ niche_data: niche })
            .match({ user_id: session.user.id, 'niche_data->niche_name->>original': niche.niche_name.original })
        );
        const [insertResult, ...updateResults] = await Promise.all([insertPromise, ...updatePromises]);
        if (insertResult && (insertResult as any).error) throw (insertResult as any).error;
        updateResults.forEach(res => { if (res.error) throw res.error; });
      } catch (error: any) {
        console.error("Error auto-saving niches to Supabase:", error);
        setNotifications(prev => [...prev, { id: Date.now(), message: 'Lỗi đồng bộ dữ liệu với cloud.', type: 'error' }]);
      }
    } else {
      localStorage.setItem('savedNiches', JSON.stringify(finalSavedNichesState));
    }

    if (nichesToInsert.length > 0) {
      setNotifications(prev => [...prev, { id: Date.now(), message: `Đã tự động lưu ${nichesToInsert.length} ý tưởng mới vào thư viện.`, type: 'success' }]);
    }
  };

  const updateTrainingHistory = async (newHistory: ChatMessage[]) => {
      setTrainingChatHistory(newHistory);
      if (session) {
          await supabase.from('training_history').upsert({ user_id: session.user.id, history_data: newHistory });
      } else {
          localStorage.setItem('trainingChatHistory', JSON.stringify(newHistory));
      }
  };
  
  const verifyTrainingPassword = (password: string) => {
    return password === trainingPassword;
  };

  const handlePasswordSuccess = (newPassword?: string) => {
    setIsPasswordModalOpen(false);
    if (passwordModalMode === 'login') {
      setIsTrainAiModalOpen(true);
    } else if (newPassword) {
      setTrainingPassword(newPassword);
      localStorage.setItem('trainingPassword', newPassword); // Password remains local
    }
  };
  
  const openChangePasswordModal = () => {
    setIsTrainAiModalOpen(false);
    setPasswordModalMode('change');
    setIsPasswordModalOpen(true);
  };

  const showNoApiKeyError = (provider: 'gemini' | 'openai') => {
    const commonBody = (
      <>
        <p className="mb-4">Vui lòng nhập một API Key hợp lệ cho <strong>{provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</strong> bằng cách bấm vào nút "API" ở góc trên bên phải để sử dụng model này.</p>
        <div className="text-left bg-gray-900/50 p-3 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-gray-200 mb-2">Làm thế nào để lấy API Key?</h4>
          {provider === 'gemini' ? (
            <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1">
              <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className={`${currentTheme.text} hover:underline`}>Google AI Studio</a>.</li>
              <li>Đăng nhập bằng tài khoản Google của bạn.</li>
              <li>Nhấp vào nút "Get API Key" hoặc "Create API key".</li>
              <li>Sao chép key và dán vào công cụ của chúng tôi thông qua nút "API".</li>
            </ol>
          ) : (
             <ol className="list-decimal list-inside text-gray-400 text-sm space-y-1">
              <li>Truy cập <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className={`${currentTheme.text} hover:underline`}>OpenAI API Keys</a>.</li>
              <li>Đăng nhập hoặc đăng ký tài khoản OpenAI.</li>
              <li>Nhấp vào nút "Create new secret key".</li>
              <li>Sao chép key và dán vào công cụ của chúng tôi thông qua nút "API".</li>
            </ol>
          )}
        </div>
      </>
    );

    setError({
        title: 'Yêu cầu API Key',
        body: commonBody,
        actionText: 'Cài đặt API',
        onAction: () => {
            setError(null);
            setIsApiKeyModalOpen(true);
        }
    });
  };

  const onKeyFailure = (index: number) => {
    setApiKeyStatuses(prev => {
        const newStatuses = [...prev];
        if (newStatuses[index] !== 'invalid') {
            newStatuses[index] = 'invalid';
            if (!session) localStorage.setItem('geminiApiKeyStatuses', JSON.stringify(newStatuses));
        }
        return newStatuses;
    });
  };

  const onOpenAIKeyFailure = (index: number) => {
    setOpenAiApiKeyStatuses(prev => {
        const newStatuses = [...prev];
        if (newStatuses[index] !== 'invalid') {
            newStatuses[index] = 'invalid';
            if (!session) localStorage.setItem('openAiApiKeyStatuses', JSON.stringify(newStatuses));
        }
        return newStatuses;
    });
  };

  const runAnalysis = async (idea: string, isNewSearch: boolean, isLoadMore: boolean = false) => {
    const isGemini = selectedModel.startsWith('gemini');
    
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
      showNoApiKeyError('gemini');
      return;
    }
    if (!isGemini && (openAiApiKeys.length === 0 || !openAiApiKeyStatuses.includes('valid'))) {
      showNoApiKeyError('openai');
      return;
    }

    if (!idea.trim()) {
      setError({ title: 'Lỗi đầu vào', body: 'Vui lòng nhập một ý tưởng ngách.' });
      return;
    }
    if (targetMarket === 'Custom' && !customMarket.trim()) {
      setError({ title: 'Lỗi đầu vào', body: 'Vui lòng nhập thị trường tùy chỉnh.' });
      return;
    }
  
    if (isLoadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
        setAnalysisResult(null);
    }
    setError(null);
    setUserInput(idea);

    if (isNewSearch) {
        setAnalysisDepth(0);
    }
  
    const marketToAnalyze = targetMarket === 'Custom' ? customMarket : targetMarket;
    const countToGenerate = parseInt(numResults, 10);
  
    try {
      let result: AnalysisResult;
      let successfulKeyIndex: number;
      const activeProvider: 'gemini' | 'openai' = isGemini ? 'gemini' : 'openai';

      if (analysisType === 'direct' && !isLoadMore) {
        if (isGemini) {
          ({ result, successfulKeyIndex } = await analyzeKeywordDirectly(idea, marketToAnalyze, apiKeys, trainingChatHistory, onKeyFailure));
        } else {
          ({ result, successfulKeyIndex } = await analyzeKeywordDirectlyWithOpenAI(idea, marketToAnalyze, openAiApiKeys, selectedModel, trainingChatHistory, onOpenAIKeyFailure));
        }
      } else { 
        const options = {
            countToGenerate,
            existingNichesToAvoid: (isLoadMore && analysisResult) ? analysisResult.niches.map(n => n.niche_name.original) : [],
            filters: { interest: interestLevel, monetization: monetizationLevel, competition: competitionLevel, sustainability: sustainabilityLevel }
        };
        if (isGemini) {
            ({ result, successfulKeyIndex } = await analyzeNicheIdea(idea, marketToAnalyze, apiKeys, trainingChatHistory, options, onKeyFailure));
        } else {
            ({ result, successfulKeyIndex } = await analyzeNicheIdeaWithOpenAI(idea, marketToAnalyze, openAiApiKeys, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure));
        }
      }

      if (activeProvider === 'gemini') {
          setActiveApiKeyIndex(successfulKeyIndex);
          setActiveOpenAiApiKeyIndex(null);
      } else {
          setActiveOpenAiApiKeyIndex(successfulKeyIndex);
          setActiveApiKeyIndex(null);
      }
      
      if (isLoadMore && analysisResult) {
        setAnalysisResult({ niches: [...analysisResult.niches, ...result.niches] });
      } else {
        setAnalysisResult(result);
      }
      await autoSaveOrUpdateNiches(result.niches);
      
      setAnalysisDepth(prev => isNewSearch ? 1 : prev + 1);

    } catch (err: any) {
      console.error(err);
      setError({ title: 'Không thể phân tích', body: `Lỗi: ${err.message || 'Vui lòng kiểm tra lại API Keys và thử lại.'}` });
      setActiveApiKeyIndex(null);
      setActiveOpenAiApiKeyIndex(null);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleAnalysis = () => runAnalysis(userInput, true);
  const handleDevelopIdea = (idea: string) => runAnalysis(idea, false);
  const handleLoadMore = () => runAnalysis(userInput, false, true);
  
  const handleScrollView = () => {
    suggestionsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleGenerateVideoIdeas = async (nicheToUpdate: Niche) => {
    const nicheName = nicheToUpdate.niche_name.original;
    if (generatingVideoIdeas.has(nicheName)) return;

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && (openAiApiKeys.length === 0 || !openAiApiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('openai');
        return;
    }

    setGeneratingVideoIdeas(prev => new Set(prev).add(nicheName));
    setError(null);

    try {
        const existingTitles = nicheToUpdate.video_ideas?.map(idea => idea.title.original) || [];
        const options = { existingIdeasToAvoid: existingTitles };

        let result: { video_ideas: VideoIdea[] };
        let successfulKeyIndex: number;

        if (isGemini) {
          ({ result, successfulKeyIndex } = await generateVideoIdeasForNiche(nicheToUpdate, apiKeys, trainingChatHistory, options, onKeyFailure));
          setActiveApiKeyIndex(successfulKeyIndex);
          setActiveOpenAiApiKeyIndex(null);
        } else {
          ({ result, successfulKeyIndex } = await generateVideoIdeasForNicheWithOpenAI(nicheToUpdate, openAiApiKeys, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure));
          setActiveOpenAiApiKeyIndex(successfulKeyIndex);
          setActiveApiKeyIndex(null);
        }

        let updatedNiche: Niche | undefined;
        setAnalysisResult(prevResult => {
            if (!prevResult) return null;
            const newNiches = prevResult.niches.map(niche => {
                if (niche.niche_name.original === nicheName) {
                    const existingIdeas = niche.video_ideas || [];
                    const newIdeas = result.video_ideas || [];
                    updatedNiche = { ...niche, video_ideas: [...existingIdeas, ...newIdeas] };
                    return updatedNiche;
                }
                return niche;
            });
            return { niches: newNiches };
        });

        if (updatedNiche) {
            await autoSaveOrUpdateNiches([updatedNiche]);
        }

    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, {
            id: Date.now(),
            message: `Lỗi khi tạo ý tưởng video cho niche: "${nicheToUpdate.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`,
            type: 'error'
        }]);
        setActiveApiKeyIndex(null);
        setActiveOpenAiApiKeyIndex(null);
    } finally {
        setGeneratingVideoIdeas(prev => {
            const newSet = new Set(prev);
            newSet.delete(nicheName);
            return newSet;
        });
    }
  };
  
  const handleUseNiche = async (niche: Niche) => {
    const nicheName = niche.niche_name.original;
    if (generatingNiches.has(nicheName)) return;

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && (openAiApiKeys.length === 0 || !openAiApiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('openai');
        return;
    }

    setGeneratingNiches(prev => new Set(prev).add(nicheName));
    setError(null);

    try {
        let result: ContentPlanResult;
        let successfulKeyIndex: number;
        if (isGemini) {
          ({ result, successfulKeyIndex } = await developVideoIdeas(niche, apiKeys, trainingChatHistory, onKeyFailure));
          setActiveApiKeyIndex(successfulKeyIndex);
          setActiveOpenAiApiKeyIndex(null);
        } else {
          ({ result, successfulKeyIndex } = await developVideoIdeasWithOpenAI(niche, openAiApiKeys, selectedModel, trainingChatHistory, onOpenAIKeyFailure));
          setActiveOpenAiApiKeyIndex(successfulKeyIndex);
          setActiveApiKeyIndex(null);
        }
        
        setContentPlanCache(prevCache => ({ ...prevCache, [nicheName]: result }));
        
        setNotifications(prev => [...prev, { id: Date.now(), message: `Đã phát triển xong 5 ý tưởng ban đầu cho niche: "${niche.niche_name.translated}"`, type: 'success' }]);

    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, { id: Date.now(), message: `Lỗi khi phát triển kế hoạch cho niche: "${niche.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`, type: 'error' }]);
        setActiveApiKeyIndex(null);
        setActiveOpenAiApiKeyIndex(null);
    } finally {
        setGeneratingNiches(prev => {
            const newSet = new Set(prev);
            newSet.delete(nicheName);
            return newSet;
        });
    }
  };

  const handleViewPlan = (niche: Niche) => {
    const cachedPlan = contentPlanCache[niche.niche_name.original];
    if (cachedPlan) {
        setContentPlan(cachedPlan);
        setActiveNicheForContentPlan(niche);
        setIsContentPlanModalOpen(true);
    }
  };
  
  const handleLoadMoreContentPlan = async () => {
    if (!activeNicheForContentPlan || !contentPlan) return;

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && (apiKeys.length === 0 || !apiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('gemini');
        return;
    }
    if (!isGemini && (openAiApiKeys.length === 0 || !openAiApiKeyStatuses.includes('valid'))) {
        showNoApiKeyError('openai');
        return;
    }

    setIsContentPlanLoadingMore(true);
    setError(null);

    try {
      const existingIdeas = contentPlan.content_ideas.map(idea => idea.title.original);
      const options = { countToGenerate: 5, existingIdeasToAvoid: existingIdeas };
      let newContent: ContentPlanResult;
      let successfulKeyIndex: number;

      if (isGemini) {
        ({ result: newContent, successfulKeyIndex } = await generateContentPlan(activeNicheForContentPlan, apiKeys, trainingChatHistory, options, onKeyFailure));
        setActiveApiKeyIndex(successfulKeyIndex);
        setActiveOpenAiApiKeyIndex(null);
      } else {
        ({ result: newContent, successfulKeyIndex } = await generateContentPlanWithOpenAI(activeNicheForContentPlan, openAiApiKeys, selectedModel, trainingChatHistory, options, onOpenAIKeyFailure));
        setActiveOpenAiApiKeyIndex(successfulKeyIndex);
        setActiveApiKeyIndex(null);
      }
      
      const updatedContentPlan = { content_ideas: [...contentPlan.content_ideas, ...newContent.content_ideas] };
      setContentPlan(updatedContentPlan);
      setContentPlanCache(prevCache => ({ ...prevCache, [activeNicheForContentPlan.niche_name.original]: updatedContentPlan }));

      let updatedNicheForSaving: Niche | undefined;
      setAnalysisResult(prevResult => {
          if (!prevResult || !activeNicheForContentPlan) return prevResult;
          const newNiches = prevResult.niches.map(niche => {
              if (niche.niche_name.original === activeNicheForContentPlan.niche_name.original) {
                  const newVideoIdeasFromPlan: VideoIdea[] = newContent.content_ideas.map(detailedIdea => ({ title: detailedIdea.title, draft_content: detailedIdea.hook }));
                  const existingVideoIdeas = niche.video_ideas || [];
                  updatedNicheForSaving = { ...niche, video_ideas: [...existingVideoIdeas, ...newVideoIdeasFromPlan] };
                  return updatedNicheForSaving;
              }
              return niche;
          });
          return { ...prevResult, niches: newNiches };
      });
      if (updatedNicheForSaving) {
        await autoSaveOrUpdateNiches([updatedNicheForSaving]);
      }

    } catch (err: any) {
      console.error(err);
      setError({ title: 'Không thể tạo thêm kế hoạch', body: `Lỗi: ${err.message || 'Vui lòng thử lại.'}` });
      setActiveApiKeyIndex(null);
      setActiveOpenAiApiKeyIndex(null);
    } finally {
      setIsContentPlanLoadingMore(false);
    }
  };

  const handleExportSaved = () => {
    if (savedNiches.length === 0) {
        setNotifications(prev => [...prev, { id: Date.now(), message: `Không có dữ liệu để xuất.`, type: 'error' }]);
        return;
    }
    const jsonString = JSON.stringify(savedNiches, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const dateTimeString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    link.download = `Nichefinder_${dateTimeString}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotifications(prev => [...prev, { id: Date.now(), message: 'Xuất thư viện thành công!', type: 'success' }]);
  };

  const handleImportSaved = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const importedData: Niche[] = JSON.parse(text);

            if (!Array.isArray(importedData) || (importedData.length > 0 && !importedData[0].niche_name?.original)) {
                throw new Error('Định dạng dữ liệu trong file không đúng.');
            }

            const existingNicheNames = new Set(savedNiches.map(n => n.niche_name.original));
            const newUniqueNiches = importedData.filter(niche => niche.niche_name?.original && !existingNicheNames.has(niche.niche_name.original));

            if (newUniqueNiches.length === 0) {
                setNotifications(prev => [...prev, { id: Date.now(), message: 'Không có ý tưởng mới nào được import. Dữ liệu có thể đã tồn tại.', type: 'error' }]);
                return;
            }

            const updatedNiches = [...savedNiches, ...newUniqueNiches];
            setSavedNiches(updatedNiches);

            if (session) {
                const recordsToInsert = newUniqueNiches.map(niche => ({ user_id: session.user.id, niche_data: niche }));
                await supabase.from('saved_niches').insert(recordsToInsert);
            } else {
                localStorage.setItem('savedNiches', JSON.stringify(updatedNiches));
            }

            const newChannelPlanCacheUpdates: Record<string, string> = {};
            newUniqueNiches.forEach(niche => {
                if (niche.channel_plan_content) {
                    newChannelPlanCacheUpdates[niche.niche_name.original] = niche.channel_plan_content;
                }
            });
            if (Object.keys(newChannelPlanCacheUpdates).length > 0) {
                setChannelPlanCache(prevCache => ({ ...prevCache, ...newChannelPlanCacheUpdates }));
            }

            setNotifications(prev => [...prev, { id: Date.now(), message: `Import thành công! Đã thêm ${newUniqueNiches.length} ý tưởng mới vào thư viện.`, type: 'success' }]);
            setIsLibraryModalOpen(false);

        } catch (err: any) {
            console.error("Lỗi khi import file:", err);
            setNotifications(prev => [...prev, { id: Date.now(), message: `Lỗi import: ${err.message || 'File không hợp lệ.'}`, type: 'error' }]);
        }
    };
    reader.readAsText(file);
  };


  const handleExportVideoIdeas = (niche: Niche) => exportVideoIdeasToTxt(niche);
  
  const handleExportNiche = (niche: Niche) => {
    exportNicheToTxt(niche);
    setNotifications(prev => [...prev, { id: Date.now(), message: `Đã xuất chi tiết ngách "${niche.niche_name.translated}" thành công!`, type: 'success' }]);
  };

  const handleClearSavedNiches = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả ${savedNiches.length} ý tưởng đã lưu không?`)) {
        if (session) {
            await supabase.from('saved_niches').delete().eq('user_id', session.user.id);
        } else {
            localStorage.removeItem('savedNiches');
        }
        setSavedNiches([]);
        setChannelPlanCache({});
    }
  };

  const handleDeleteSavedNiche = async (nicheNameToDelete: string) => {
    const nicheToDelete = savedNiches.find(n => n.niche_name.original === nicheNameToDelete);
    if (session && nicheToDelete) {
        await supabase.from('saved_niches').delete().match({ user_id: session.user.id, 'niche_data->niche_name->>original': nicheNameToDelete });
    }
    const newSavedNiches = savedNiches.filter(saved => saved.niche_name.original !== nicheNameToDelete);
    if (!session) {
        localStorage.setItem('savedNiches', JSON.stringify(newSavedNiches));
    }
    setSavedNiches(newSavedNiches);
    setChannelPlanCache(prev => {
        const newCache = { ...prev };
        delete newCache[nicheNameToDelete];
        return newCache;
    });
  };

  const handleUseSavedNiche = (niche: Niche) => {
    setIsLibraryModalOpen(false);
    setAnalysisResult({ niches: [niche] });
    setUserInput(niche.niche_name.original);
    setAnalysisType('direct');
    setError(null);
    setIsLoading(false);
    setTimeout(() => suggestionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const handleViewSavedChannelPlan = (niche: Niche) => {
      if (niche.channel_plan_content) {
          setChannelPlanContent(niche.channel_plan_content);
          setActiveNicheForChannelPlan(niche);
          setIsChannelPlanModalOpen(true);
          setIsLibraryModalOpen(false);
      }
  };

  const handleSendTrainingMessage = async (message: string, files: File[]) => {
    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && !apiKeyStatuses.includes('valid')) {
        updateTrainingHistory([...trainingChatHistory, { role: 'model', parts: [{ text: "Lỗi: Vui lòng cấu hình API Key hợp lệ cho Gemini."}] }]);
        return;
    }
     if (!isGemini && !openAiApiKeyStatuses.includes('valid')) {
        updateTrainingHistory([...trainingChatHistory, { role: 'model', parts: [{ text: "Lỗi: Vui lòng cấu hình API Key hợp lệ cho OpenAI."}] }]);
        return;
    }

    const userMessageParts: Part[] = [];
    let combinedText = message;

    if (files.length > 0) {
        if (isGemini) {
          combinedText += `\n\n--- Tệp đã tải lên ---\n${files.map(f => `- ${f.name}`).join('\n')}`;
        } else {
          combinedText += `\n\n[OpenAI model không thể xử lý trực tiếp tệp đính kèm.]`;
        }
    }
    if (combinedText.trim()) userMessageParts.push({ text: combinedText.trim() });
    if (isGemini) userMessageParts.push(...await Promise.all(files.map(fileToGenerativePart)));
    if (userMessageParts.length === 0) return;

    const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
    const newHistory = [...trainingChatHistory, userMessage];
    updateTrainingHistory(newHistory);
    setIsTrainingLoading(true);

    try {
        let responseText: string;
        let successfulKeyIndex: number;
        if (isGemini) {
          ({ result: responseText, successfulKeyIndex } = await getTrainingResponse(newHistory, apiKeys, onKeyFailure));
          setActiveApiKeyIndex(successfulKeyIndex);
          setActiveOpenAiApiKeyIndex(null);
        } else {
          ({ result: responseText, successfulKeyIndex } = await getTrainingResponseWithOpenAI(newHistory, openAiApiKeys, selectedModel, onOpenAIKeyFailure));
          setActiveOpenAiApiKeyIndex(successfulKeyIndex);
          setActiveApiKeyIndex(null);
        }
        updateTrainingHistory([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);
    } catch(e: any) {
        console.error(e);
        updateTrainingHistory([...trainingChatHistory, userMessage, { role: 'model', parts: [{ text: `Lỗi: ${e.message}`}] }]);
        setActiveApiKeyIndex(null);
        setActiveOpenAiApiKeyIndex(null);
    } finally {
        setIsTrainingLoading(false);
    }
  };

  const _generatePlanApiCall = async (niche: Niche, isMoreDetailed: boolean) => {
      const isGemini = selectedModel.startsWith('gemini');
      let result: string;
      let successfulKeyIndex: number;
      const options = { isMoreDetailed };

      if (isGemini) {
          ({ result, successfulKeyIndex } = await generateChannelPlan(niche, apiKeys, trainingChatHistory, onKeyFailure, options));
          setActiveApiKeyIndex(successfulKeyIndex);
          setActiveOpenAiApiKeyIndex(null);
      } else {
          ({ result, successfulKeyIndex } = await generateChannelPlanWithOpenAI(niche, openAiApiKeys, selectedModel, trainingChatHistory, onOpenAIKeyFailure, options));
          setActiveOpenAiApiKeyIndex(successfulKeyIndex);
          setActiveApiKeyIndex(null);
      }
      return result;
  }

  const handleGenerateChannelPlan = async (niche: Niche) => {
    const nicheName = niche.niche_name.original;
    if (generatingChannelPlan.has(nicheName)) return;

    if (channelPlanCache[nicheName]) {
        setChannelPlanContent(channelPlanCache[nicheName]);
        setActiveNicheForChannelPlan(niche);
        setIsChannelPlanModalOpen(true);
        return;
    }

    const isGemini = selectedModel.startsWith('gemini');
    if (isGemini && !apiKeyStatuses.includes('valid')) { showNoApiKeyError('gemini'); return; }
    if (!isGemini && !openAiApiKeyStatuses.includes('valid')) { showNoApiKeyError('openai'); return; }

    setGeneratingChannelPlan(prev => new Set(prev).add(nicheName));
    setError(null);
    
    try {
        const result = await _generatePlanApiCall(niche, false);
        const nicheWithPlan = { ...niche, channel_plan_content: result };
        
        setChannelPlanContent(result);
        setChannelPlanCache(prev => ({ ...prev, [nicheName]: result }));
        await autoSaveOrUpdateNiches([nicheWithPlan]);

        setAnalysisResult(prev => {
            if (!prev) return null;
            return {
                ...prev,
                niches: prev.niches.map(n => n.niche_name.original === nicheName ? nicheWithPlan : n)
            };
        });

        setActiveNicheForChannelPlan(nicheWithPlan);
        setIsChannelPlanModalOpen(true);
    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, { id: Date.now(), message: `Lỗi khi tạo kế hoạch kênh cho: "${niche.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`, type: 'error' }]);
        setActiveApiKeyIndex(null);
        setActiveOpenAiApiKeyIndex(null);
    } finally {
        setGeneratingChannelPlan(prev => {
            const newSet = new Set(prev);
            newSet.delete(nicheName);
            return newSet;
        });
    }
  };

  const handleGenerateMoreDetailedChannelPlan = async () => {
    if (!activeNicheForChannelPlan) return;
    const niche = activeNicheForChannelPlan;
    const nicheName = niche.niche_name.original;

    setIsGeneratingMoreDetailedPlan(true);
    setError(null);
    
    try {
        const result = await _generatePlanApiCall(niche, true);
        const nicheWithDetailedPlan = { ...niche, channel_plan_content: result };

        setChannelPlanContent(result);
        setChannelPlanCache(prev => ({ ...prev, [nicheName]: result }));
        await autoSaveOrUpdateNiches([nicheWithDetailedPlan]);

        setAnalysisResult(prev => {
            if (!prev) return null;
            return {
                ...prev,
                niches: prev.niches.map(n => n.niche_name.original === nicheName ? nicheWithDetailedPlan : n)
            };
        });
        setActiveNicheForChannelPlan(nicheWithDetailedPlan);
    } catch (err: any) {
        console.error(err);
        setNotifications(prev => [...prev, { id: Date.now(), message: `Lỗi khi tạo kế hoạch chi tiết hơn: "${niche.niche_name.translated}". ${err.message || 'Vui lòng thử lại.'}`, type: 'error' }]);
        setActiveApiKeyIndex(null);
        setActiveOpenAiApiKeyIndex(null);
    } finally {
        setIsGeneratingMoreDetailedPlan(false);
    }
  };


  const Logo: React.FC<{ theme: string }> = ({ theme }) => {
    const themeGradient = themes[theme]?.gradient || themes.teal.gradient;
    return (
        <a href="/" className="flex items-center space-x-3">
        <svg className="h-10 w-10 text-youtube-red" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <h1 className="text-3xl font-bold tracking-tight">
            YouTube Niche Finder{' '}
            <span className={`bg-gradient-to-r ${themeGradient} text-transparent bg-clip-text`}>AI</span>
        </h1>
        </a>
    );
  };

  const hasValidGeminiKey = apiKeyStatuses.includes('valid');
  const hasValidOpenAiKey = openAiApiKeyStatuses.includes('valid');
  const hasAnyValidKey = hasValidGeminiKey || hasValidOpenAiKey;

  if (!isAuthChecked) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
              <Loader />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200">
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
      <header className="absolute top-0 right-0 p-4 z-10">
        <div className="flex items-center space-x-2">
            <div ref={themeDropdownRef} className="relative">
                <button
                    onClick={() => setIsThemeDropdownOpen(prev => !prev)}
                    className="flex items-center justify-center w-10 h-10 bg-gray-800/80 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="Chọn theme"
                >
                    <PaintBrushIcon />
                </button>
                {isThemeDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-20">
                    {Object.entries(themes).map(([key, { name, gradient }]) => (
                        <button key={key} onClick={() => handleSetTheme(key)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3">
                            <span className={`h-4 w-4 rounded-full bg-gradient-to-r ${gradient}`}></span>
                            <span>{name}</span>
                        </button>
                    ))}
                    </div>
                )}
            </div>
            <Auth session={session} theme={currentTheme} />
            <button
                onClick={() => setIsLibraryModalOpen(true)}
                className="relative flex items-center space-x-2 px-4 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Thư viện"
            >
                <BookmarkIcon />
                <span>Thư viện</span>
                {savedNiches.length > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-youtube-red text-xs font-bold text-white">
                        {savedNiches.length}
                    </span>
                )}
            </button>
            <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors duration-300 border ${
                    hasAnyValidKey ? 'bg-green-600 hover:bg-green-700 border-green-500' : 'bg-orange-500 hover:bg-orange-600 border-orange-400'
                }`}
                aria-label="Nhập API Key"
            >
                API
            </button>
            <button
                onClick={() => { setPasswordModalMode('login'); setIsPasswordModalOpen(true); }}
                className="px-4 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Train AI Tool"
            >
                Train AI Tool
            </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <Logo theme={theme}/>
          <p className="text-base text-gray-400 max-w-2xl">
            Nhập một ý tưởng, từ khóa, hoặc đam mê. AI của chúng tôi sẽ phân tích các chiến lược thành công trên YouTube để đề xuất những ngách có tiềm năng cao và ý tưởng video viral.
          </p>

          <div className="w-full max-w-2xl space-y-4">
            <SearchBar
              userInput={userInput}
              setUserInput={setUserInput}
              handleAnalysis={handleAnalysis}
              isLoading={isLoading}
              placeholder={searchPlaceholder}
              theme={currentTheme}
            />
            <div className="w-full max-w-2xl text-left">
                <div className="flex items-center justify-center gap-6 bg-gray-800/50 border border-gray-700 p-3 rounded-lg">
                    <span className="text-sm font-medium text-gray-400">Loại phân tích:</span>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
                            <input
                                type="radio"
                                name="analysisType"
                                value="related"
                                checked={analysisType === 'related'}
                                onChange={() => setAnalysisType('related')}
                                className={`form-radio h-4 w-4 bg-gray-700 border-gray-600 ${currentTheme.radio} ${currentTheme.focusRing}`}
                                disabled={isLoading}
                            />
                            <span>Tìm chủ đề liên quan</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-gray-300">
                            <input
                                type="radio"
                                name="analysisType"
                                value="direct"
                                checked={analysisType === 'direct'}
                                onChange={() => setAnalysisType('direct')}
                                className={`form-radio h-4 w-4 bg-gray-700 border-gray-600 ${currentTheme.radio} ${currentTheme.focusRing}`}
                                disabled={isLoading}
                            />
                            <span>Phân tích key này</span>
                        </label>
                    </div>
                </div>
            </div>
            <div className="w-full text-left bg-gray-800/50 border border-gray-700 p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="model-select" className="block text-sm font-medium text-gray-400 mb-2">AI Model</label>
                        <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className={`w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                            disabled={isLoading}
                        >
                            <optgroup label="Google Gemini">
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            </optgroup>
                            <optgroup label="OpenAI">
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </optgroup>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="market-select" className="block text-sm font-medium text-gray-400 mb-2">Thị trường hướng đến</label>
                        <select
                            id="market-select"
                            value={targetMarket}
                            onChange={(e) => setTargetMarket(e.target.value)}
                            className={`w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                            disabled={isLoading}
                        >
                            {markets.map(m => <option key={m} value={m}>{m === 'Custom' ? 'Tùy chỉnh...' : m}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="num-results-select" className="block text-sm font-medium text-gray-400 mb-2">Số kết quả trả về</label>
                        <select
                            id="num-results-select"
                            value={numResults}
                            onChange={(e) => setNumResults(e.target.value)}
                            className={`w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                            disabled={isLoading || analysisType === 'direct'}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                </div>

                {targetMarket === 'Custom' && (
                    <input
                        type="text"
                        value={customMarket}
                        onChange={(e) => setCustomMarket(e.target.value)}
                        placeholder="Nhập thị trường khác (ví dụ: 'Ấn Độ', 'Brazil')"
                        className={`w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300 placeholder-gray-500`}
                        disabled={isLoading}
                    />
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <FilterDropdown label="Mức độ quan tâm" value={interestLevel} onChange={setInterestLevel} disabled={isLoading || analysisType === 'direct'} tooltipText="Lọc các ngách dựa trên mức độ quan tâm và khối lượng tìm kiếm của khán giả. 'Cao' có nghĩa là rất phổ biến." theme={currentTheme}/>
                    <FilterDropdown label="Tiềm năng kiếm tiền" value={monetizationLevel} onChange={setMonetizationLevel} disabled={isLoading || analysisType === 'direct'} tooltipText="Lọc các ngách dựa trên khả năng kiếm tiền (quảng cáo, affiliate, v.v.). 'Cao' có nghĩa là RPM ước tính cao hơn." theme={currentTheme}/>
                    <FilterDropdown label="Mức độ cạnh tranh" value={competitionLevel} onChange={setCompetitionLevel} disabled={isLoading || analysisType === 'direct'} tooltipText="Lọc các ngách dựa trên mức độ cạnh tranh. 'Thấp' có nghĩa là ít cạnh tranh hơn, dễ dàng hơn để nổi bật." theme={currentTheme}/>
                    <FilterDropdown label="Tính bền vững" value={sustainabilityLevel} onChange={setSustainabilityLevel} disabled={isLoading || analysisType === 'direct'} tooltipText="Lọc các ngách dựa trên tiềm năng lâu dài và khả năng tạo nội dung bền vững. 'Cao' có nghĩa là ngách có tính evergreen." theme={currentTheme}/>
                </div>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                    onClick={handleAnalysis}
                    disabled={isLoading}
                    className={`w-full sm:flex-1 px-8 py-3 ${currentTheme.bg} ${currentTheme.bgHover} text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2`}
                >
                    <span>{isLoading ? 'Đang phân tích...' : 'Phân Tích Ý Tưởng'}</span>
                </button>
                {!analysisResult && !isLoading && !error && (
                    <button
                        onClick={handleScrollView}
                        disabled={isLoading}
                        className="w-full sm:flex-1 px-6 py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        <span>Xem gợi ý</span>
                    </button>
                )}
             </div>
          </div>
          
          <div className="w-full pt-8" ref={suggestionsRef}>
            {isLoading && <Loader />}
            
            {analysisResult && !isLoading ? (
                <ResultsDisplay 
                  result={analysisResult} 
                  onDevelop={handleDevelopIdea}
                  analysisDepth={analysisDepth}
                  onLoadMore={handleLoadMore}
                  isLoadingMore={isLoadingMore}
                  savedNiches={savedNiches}
                  onUseNiche={handleUseNiche}
                  onViewPlan={handleViewPlan}
                  generatingNiches={generatingNiches}
                  contentPlanCache={contentPlanCache}
                  numResults={numResults}
                  onGenerateVideoIdeas={handleGenerateVideoIdeas}
                  generatingVideoIdeas={generatingVideoIdeas}
                  onExportVideoIdeas={handleExportVideoIdeas}
                  onExportNiche={handleExportNiche}
                  isDirectAnalysis={analysisType === 'direct'}
                  theme={theme}
                  onGenerateChannelPlan={handleGenerateChannelPlan}
                  generatingChannelPlan={generatingChannelPlan}
                  channelPlanCache={channelPlanCache}
                />
            ) : (
                !isLoading && !error && (
                    <InitialSuggestions setUserInput={setUserInput} theme={theme} />
                )
            )}
          </div>
        </div>
      </main>

      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} onSaveAndCheckGemini={handleSaveAndCheckGeminiApiKeys} onSaveAndCheckOpenAI={handleSaveAndCheckOpenAiApiKeys} onRecheckAll={() => checkAndSetAllApiKeys(apiKeys, openAiApiKeys)} onDeleteKey={handleDeleteApiKey} onDeleteOpenAiKey={handleDeleteOpenAiApiKey} currentApiKeys={apiKeys} activeApiKeyIndex={activeApiKeyIndex} apiKeyStatuses={apiKeyStatuses} currentOpenAiApiKeys={openAiApiKeys} openAiApiKeyStatuses={openAiApiKeyStatuses} activeOpenAiApiKeyIndex={activeOpenAiApiKeyIndex} theme={theme} />
      <TrainAiModal isOpen={isTrainAiModalOpen} onClose={() => setIsTrainAiModalOpen(false)} chatHistory={trainingChatHistory} onSendMessage={handleSendTrainingMessage} isLoading={isTrainingLoading} onChangePassword={openChangePasswordModal} selectedModel={selectedModel} theme={theme} />
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={handlePasswordSuccess} mode={passwordModalMode} verifyPassword={verifyTrainingPassword} theme={theme} />
      <ContentPlanModal isOpen={isContentPlanModalOpen} onClose={() => setIsContentPlanModalOpen(false)} contentPlan={contentPlan} activeNiche={activeNicheForContentPlan} onLoadMore={handleLoadMoreContentPlan} isLoadingMore={isContentPlanLoadingMore} theme={theme} />
      <ChannelPlanModal isOpen={isChannelPlanModalOpen} onClose={() => setIsChannelPlanModalOpen(false)} planContent={channelPlanContent} activeNiche={activeNicheForChannelPlan} theme={theme} onGenerateMoreDetailedPlan={handleGenerateMoreDetailedChannelPlan} isLoadingMore={isGeneratingMoreDetailedPlan} />
      <LibraryModal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} savedNiches={savedNiches} onDeleteNiche={handleDeleteSavedNiche} onDeleteAll={handleClearSavedNiches} onExport={handleExportSaved} onImport={handleImportSaved} onUseNiche={handleUseSavedNiche} onViewChannelPlan={handleViewSavedChannelPlan} theme={theme} />
      <ErrorModal isOpen={!!error} onClose={() => setError(null)} title={error?.title || 'Đã có lỗi xảy ra'} actionText={error?.actionText} onAction={error?.onAction} theme={theme}>{error?.body}</ErrorModal>
    </div>
  );
};

export default App;