
import React, { useState, useEffect } from 'react';
import type { ApiKeyStatus } from '../App';
import { CheckCircleIcon, XCircleIcon, TrashIcon, GoogleIcon } from './icons/Icons';
import { themes } from '../theme';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndCheckGemini: (apiKeys: string[]) => Promise<void>;
  onSaveAndCheckOpenAI: (apiKeys: string[]) => Promise<void>;
  onRecheckAll: () => Promise<void>;
  onDeleteKey: (index: number) => void;
  onDeleteOpenAiKey: (index: number) => void;
  currentApiKeys: string[];
  activeApiKeyIndex: number | null;
  apiKeyStatuses: ApiKeyStatus[];
  currentOpenAIApiKeys: string[];
  openAIApiKeyStatuses: ApiKeyStatus[];
  activeOpenAIApiKeyIndex: number | null;
  theme: string;
}

const StatusIcon: React.FC<{ status: ApiKeyStatus; themeColor: string; }> = ({ status, themeColor }) => {
    if (status === 'checking') {
        return <div className={`w-4 h-4 border-2 border-t-${themeColor}-400 border-gray-500 rounded-full animate-spin`}></div>;
    }
    if (status === 'valid') {
        return <div className="text-green-400"><CheckCircleIcon /></div>;
    }
    if (status === 'invalid') {
        return <div className="text-red-400"><XCircleIcon /></div>;
    }
    return <div className="w-4 h-4"></div>; // Placeholder for 'idle'
};

const OpenAIIcon: React.FC = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.12,6.11a1,1,0,0,0-.81-.24,1,1,0,0,0-.24.81,6.88,6.88,0,0,1-1.35,3.58,1,1,0,0,0,.2,1.39,1,1,0,0,0,.6.26,1,1,0,0,0,.8-.41,8.88,8.88,0,0,0,1.74-4.62A1,1,0,0,0,21.12,6.11Z" />
      <path d="M12.4,12.23a1,1,0,0,0-1,1v4.29a1,1,0,0,0,1,1,6.88,6.88,0,0,0,4.87-2,1,1,0,0,0,0-1.42,1,1,0,0,0-1.42,0,4.89,4.89,0,0,1-3.45,1.42V13.23A1,1,0,0,0,12.4,12.23Z" />
      <path d="M5.52,3.31a1,1,0,0,0-1.42,0,6.88,6.88,0,0,0,0,9.74,1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42,4.89,4.89,0,0,1,0-6.9A1,1,0,0,0,5.52,3.31Z" />
      <path d="M11.4,11.82A1,1,0,0,0,11,10.23V6a1,1,0,0,0-1-1A6.88,6.88,0,0,0,4.1,7a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0A4.89,4.89,0,0,1,9,7.05v4.22a1,1,0,0,0,.41.8,1,1,0,0,0,1.19-.2Z" />
      <path d="M18.88,17.89a1,1,0,0,0-1.19.2,4.89,4.89,0,0,1-6.57,0,1,1,0,0,0-1.42,1.42,6.88,6.88,0,0,0,9.41,0,1,1,0,0,0-.23-1.62Z" />
    </svg>
);


const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
    isOpen, onClose, onSaveAndCheckGemini, onSaveAndCheckOpenAI, onRecheckAll, onDeleteKey, onDeleteOpenAiKey,
    currentApiKeys, activeApiKeyIndex, apiKeyStatuses,
    currentOpenAIApiKeys, openAIApiKeyStatuses, activeOpenAIApiKeyIndex,
    theme
}) => {
  const [geminiKeysInput, setGeminiKeysInput] = useState('');
  const [openAiKeysInput, setOpenAiKeysInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const currentTheme = themes[theme] || themes.teal;


  useEffect(() => {
    if (isOpen) {
      setGeminiKeysInput(currentApiKeys.join('\n'));
      setOpenAiKeysInput(currentOpenAIApiKeys.join('\n'));
    }
  }, [isOpen, currentApiKeys, currentOpenAIApiKeys]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsChecking(true);
    const newGeminiKeys = geminiKeysInput.split('\n').map(k => k.trim()).filter(Boolean);
    const newOpenAiKeys = openAiKeysInput.split('\n').map(k => k.trim()).filter(Boolean);
    
    await Promise.all([
      onSaveAndCheckGemini(newGeminiKeys),
      onSaveAndCheckOpenAI(newOpenAiKeys)
    ]);
    
    setIsChecking(false);
  };

  const handleRecheckCurrentKeys = async () => {
    setIsChecking(true);
    await onRecheckAll();
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <h2 className={`text-xl font-bold mb-2 bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>Quản lý API Keys</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Thêm hoặc chỉnh sửa API Keys cho Google Gemini và OpenAI. Hệ thống sẽ tự động thử các key hợp lệ theo thứ tự.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
          {/* --- Gemini Section --- */}
          <div className="flex flex-col min-h-0">
              <h3 className="text-md font-bold text-gray-300 mb-2 flex items-center gap-2"><GoogleIcon /> Google Gemini</h3>
              <div className="flex-grow flex flex-col min-h-0 border border-gray-700 rounded-lg p-3 bg-gray-900/40">
                <label htmlFor="gemini-keys-textarea" className="text-sm font-semibold text-gray-400 mb-2">Chỉnh sửa Keys Gemini (mỗi key một dòng)</label>
                <textarea
                    id="gemini-keys-textarea"
                    value={geminiKeysInput}
                    onChange={(e) => setGeminiKeysInput(e.target.value)}
                    placeholder="Dán các Gemini API Key vào đây..."
                    className={`flex-grow p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300 font-mono text-sm resize-none`}
                />
                <div className="text-xs text-gray-400 mt-2">Lấy key từ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className={`${currentTheme.text} hover:underline`}>Google AI Studio</a>.</div>
                <div className="h-40 overflow-y-auto bg-gray-800/50 p-2 rounded-lg border border-gray-700/50 mt-3">
                  {currentApiKeys.length > 0 ? (
                      <ul className="space-y-2">
                          {currentApiKeys.map((key, index) => (
                              <li key={index} className={`flex items-center justify-between p-2 rounded-md transition-colors ${index === activeApiKeyIndex ? currentTheme.activeBg : 'bg-gray-700'}`}>
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                      <StatusIcon status={apiKeyStatuses[index] || 'idle'} themeColor={theme} />
                                      <span className="font-mono text-sm text-gray-300 truncate" title={key}>{`...${key.slice(-6)}`}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                      {index === activeApiKeyIndex && <span className={`text-xs ${currentTheme.text} font-bold ${currentTheme.activeBg} px-2 py-1 rounded-full`}>ACTIVE</span>}
                                      <button onClick={() => onDeleteKey(index)} className="p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors" aria-label={`Xóa Key ${index + 1}`}><TrashIcon /></button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  ) : <div className="flex items-center justify-center h-full text-gray-500 text-sm">Chưa có Gemini key.</div>}
                </div>
              </div>
          </div>

          {/* --- OpenAI Section --- */}
          <div className="flex flex-col min-h-0">
              <h3 className="text-md font-bold text-gray-300 mb-2 flex items-center gap-2"><OpenAIIcon /> OpenAI</h3>
              <div className="flex-grow flex flex-col min-h-0 border border-gray-700 rounded-lg p-3 bg-gray-900/40">
                <label htmlFor="openai-keys-textarea" className="text-sm font-semibold text-gray-400 mb-2">Chỉnh sửa Keys OpenAI (mỗi key một dòng)</label>
                <textarea
                    id="openai-keys-textarea"
                    value={openAiKeysInput}
                    onChange={(e) => setOpenAiKeysInput(e.target.value)}
                    placeholder="Dán các OpenAI API Key vào đây..."
                    className={`flex-grow p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300 font-mono text-sm resize-none`}
                />
                <div className="text-xs text-gray-400 mt-2">Lấy key từ <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className={`${currentTheme.text} hover:underline`}>trang tổng quan OpenAI</a>.</div>
                <div className="h-40 overflow-y-auto bg-gray-800/50 p-2 rounded-lg border border-gray-700/50 mt-3">
                  {currentOpenAIApiKeys.length > 0 ? (
                      <ul className="space-y-2">
                          {currentOpenAIApiKeys.map((key, index) => (
                              <li key={index} className={`flex items-center justify-between p-2 rounded-md transition-colors ${index === activeOpenAIApiKeyIndex ? currentTheme.activeBg : 'bg-gray-700'}`}>
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                      <StatusIcon status={openAIApiKeyStatuses[index] || 'idle'} themeColor={theme} />
                                      <span className="font-mono text-sm text-gray-300 truncate" title={key}>{`...${key.slice(-6)}`}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                      {index === activeOpenAIApiKeyIndex && <span className={`text-xs ${currentTheme.text} font-bold ${currentTheme.activeBg} px-2 py-1 rounded-full`}>ACTIVE</span>}
                                      <button onClick={() => onDeleteOpenAiKey(index)} className="p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors" aria-label={`Xóa OpenAI Key ${index + 1}`}><TrashIcon /></button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  ) : <div className="flex items-center justify-center h-full text-gray-500 text-sm">Chưa có OpenAI key.</div>}
                </div>
              </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleRecheckCurrentKeys}
            disabled={isChecking || (currentApiKeys.length === 0 && currentOpenAIApiKeys.length === 0)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking && <div className="w-4 h-4 border-2 border-t-white border-gray-800 rounded-full animate-spin"></div>}
            <span>Kiểm tra lại API Keys</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isChecking}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.bg} ${currentTheme.bgHover}`}
          >
            {isChecking && <div className="w-4 h-4 border-2 border-t-white border-teal-800 rounded-full animate-spin"></div>}
            <span>{isChecking ? 'Đang kiểm tra...' : 'Lưu và kiểm tra tất cả'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
