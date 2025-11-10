
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { BrainIcon, PaperclipIcon, XIcon, KeyIcon } from './icons/Icons';
import { themes } from '../theme';

interface TrainAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, files: File[]) => void;
  isLoading: boolean;
  onChangePassword: () => void;
  selectedModel: string;
  theme: string;
}

const MAX_TOTAL_SIZE_MB = 4;

const TrainAiModal: React.FC<TrainAiModalProps> = ({ isOpen, onClose, chatHistory, onSendMessage, isLoading, onChangePassword, selectedModel, theme }) => {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentTheme = themes[theme] || themes.teal;
  const isGemini = selectedModel.startsWith('gemini');

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, chatHistory]);
  
  // If model changes to OpenAI and there are files, clear them
  useEffect(() => {
    if (!isGemini) {
        setFiles([]);
    }
  }, [isGemini]);


  if (!isOpen) return null;

  const handleSend = () => {
    if (input.trim() || (files.length > 0 && isGemini)) {
      onSendMessage(input.trim(), files);
      setInput('');
      setFiles([]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        const newFiles = Array.from(event.target.files);
        // FIX: Add explicit types to reduce callback arguments to prevent type inference issues.
        const currentSize = files.reduce((acc: number, file: File) => acc + file.size, 0);
        const newSize = newFiles.reduce((acc: number, file: File) => acc + file.size, 0);

        if ((currentSize + newSize) / (1024 * 1024) > MAX_TOTAL_SIZE_MB) {
            alert(`Tổng kích thước tệp không được vượt quá ${MAX_TOTAL_SIZE_MB}MB.`);
             // Clear the file input value
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
        // Clear the file input value to allow selecting the same file again
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };


  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <BrainIcon />
                </div>
                <div>
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>Train AI Tool</h2>
                    <p className="text-sm text-gray-400">Dạy cho AI kiến thức mới. Những gì bạn cung cấp ở đây sẽ được ghi nhớ cho các lần phân tích sau.</p>
                </div>
            </div>
            <button
                onClick={onChangePassword}
                className="px-3 py-1.5 border border-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Đổi mật khẩu"
            >
                Đổi mật khẩu
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((msg, index) => {
             const textContent = msg.parts
                .filter(p => p.text)
                .map(p => p.text)
                .join('\n');
            
            if (!textContent.trim() && msg.parts.every(p => !p.text)) return null;

            return (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: textContent.replace(/\n/g, '<br />') }}></p>
                  </div>
                </div>
            );
          })}
           {isLoading && (
             <div className="flex justify-start">
                <div className="max-w-lg px-4 py-2 rounded-lg bg-gray-700 text-gray-200">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 border-t border-gray-700">
          {files.length > 0 && isGemini && (
            <div className="mb-2 flex flex-wrap gap-2 p-2 bg-gray-900/50 rounded-md">
              {files.map((file, index) => (
                <div key={index} className="bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-200 flex items-center gap-2">
                  <span>{file.name}</span>
                  <button onClick={() => removeFile(file)} className="text-gray-400 hover:text-white transition-colors" aria-label={`Remove ${file.name}`}>
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dán văn bản hoặc tài liệu vào đây để huấn luyện AI..."
              className={`w-full p-3 pr-28 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300 resize-none`}
              rows={2}
              disabled={isLoading}
            />
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,text/plain,text/markdown,application/json,text/csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isLoading || !isGemini} 
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Attach files"
                    title={!isGemini ? "Đính kèm tệp chỉ được hỗ trợ cho các mô hình Gemini" : "Đính kèm tệp"}
                >
                    <PaperclipIcon />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && files.length === 0)}
                  className={`px-4 py-2 rounded-md text-sm text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors ${currentTheme.bg} ${currentTheme.bgHover}`}
                >
                  Gửi
                </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TrainAiModal;
