import React, { useState } from 'react';
import type { Niche } from '../types';
// Fix: Import ClipboardListIcon to resolve reference error.
import {
    DocumentTextIcon, XIcon, ArrowsExpandIcon, ArrowsShrinkIcon, DownloadIcon, PlusCircleIcon,
    InformationCircleIcon, UserGroupIcon, CollectionIcon, CalendarIcon, TrendingUpIcon, PaintBrushIcon,
    DollarSignIcon, RocketLaunchIcon, TagIcon, ClipboardListIcon
} from './icons/Icons';
import { themes } from '../theme';
import { exportTextToTxt } from '../utils/export';

interface ChannelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planContent: string | null;
  activeNiche: Niche | null;
  theme: string;
  onGenerateMoreDetailedPlan: () => void;
  isLoadingMore: boolean;
}

interface PlanSection {
    icon: React.ReactNode;
    title: string;
    content: string;
}

// A simple markdown to HTML renderer for basic formatting
const renderContent = (text: string) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^ {2,}- (.*$)/gim, '<li class="ml-8 list-disc">$1</li>')
      .replace(/^→ (.*$)/gim, '<p class="mt-2 pl-4 border-l-2 border-gray-600">$1</p>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-sm rounded px-1 py-0.5 font-mono">$1</code>')
      .replace(/\n/g, '<br />');

    // Clean up extra breaks
    html = html.replace(/<\/li><br \/>/g, '</li>');
    html = html.replace(/<br \/><(ul|li|p)/g, '<$1');
    html = html.replace(/<br \/><br \/>/g, '<br />');

    return <div className="text-sm text-gray-300 leading-relaxed space-y-2" dangerouslySetInnerHTML={{ __html: html }} />;
};


const ChannelPlanModal: React.FC<ChannelPlanModalProps> = ({ isOpen, onClose, planContent, activeNiche, theme, onGenerateMoreDetailedPlan, isLoadingMore }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen || !planContent) return null;

  const currentTheme = themes[theme] || themes.teal;

  const handleDownload = () => {
    if (planContent && activeNiche) {
        exportTextToTxt(planContent, `channel_plan_${activeNiche.niche_name.original}`);
    }
  };

  const sectionIconMap: { [key: string]: React.ReactNode } = {
    'tóm tắt kênh': <InformationCircleIcon />,
    'đối tượng mục tiêu': <UserGroupIcon />,
    'cấu trúc nội dung / series': <CollectionIcon />,
    'lịch đăng video': <CalendarIcon />,
    'chiến lược seo và tăng trưởng': <TrendingUpIcon />,
    'thương hiệu, giọng điệu, phong cách hình ảnh': <PaintBrushIcon />,
    'kế hoạch kiếm tiền': <DollarSignIcon />,
    'định hướng phát triển dài hạn': <RocketLaunchIcon />,
    'gợi ý 5 bộ tên kênh': <TagIcon />,
  };
  
  const parseMarkdownToSections = (text: string): PlanSection[] => {
    const sections = text.split('## ').slice(1);
    return sections
      .filter(sectionText => sectionText.trim() !== '')
      .map(sectionText => {
        const parts = sectionText.split('\n');
        const title = parts[0].replace(/^[0-9]+\. /, '').trim();
        const content = parts.slice(1).join('\n').trim();
        const normalizedTitle = title.toLowerCase().replace(/^[0-9.]+\s*/, '');
        const icon = sectionIconMap[normalizedTitle] || <DocumentTextIcon />;
        return { icon, title, content };
      });
  };
  
  const planSections = parseMarkdownToSections(planContent);

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 animate-fade-in-down" 
        onClick={onClose}
    >
      <div 
        className={`bg-gray-800 rounded-lg shadow-xl flex flex-col transition-all duration-300 ${isMaximized ? 'w-full h-full max-w-full max-h-full rounded-none' : 'w-full max-w-5xl h-[90vh]'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
                <div className="text-teal-400">
                    <ClipboardListIcon />
                </div>
                <div>
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>Kế hoạch phát triển kênh</h2>
                    <p className="text-sm text-gray-400">Phân tích chi tiết cho ngách: <span className="font-semibold text-gray-300">{activeNiche?.niche_name.translated}</span></p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                    aria-label={isMaximized ? "Thu nhỏ" : "Phóng to"}
                >
                    {isMaximized ? <ArrowsShrinkIcon /> : <ArrowsExpandIcon />}
                </button>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Đóng"
                >
                    <XIcon />
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
            <div className="space-y-4">
                {planSections.map((section, index) => (
                    <div key={index} className="bg-gray-800/70 border border-gray-700/80 rounded-lg p-5">
                        <h3 className={`text-lg font-bold flex items-center gap-3 mb-3 bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>
                            {React.cloneElement(section.icon as React.ReactElement, { className: `h-6 w-6 ${currentTheme.text}` })}
                            <span>{section.title}</span>
                        </h3>
                        {renderContent(section.content)}
                    </div>
                ))}
            </div>
        </div>
        
         <footer className="p-4 border-t border-gray-700 flex justify-end items-center gap-4 flex-shrink-0">
            <button
                onClick={onGenerateMoreDetailedPlan}
                disabled={isLoadingMore}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-gray-200 rounded-md text-sm hover:bg-gray-500 hover:text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoadingMore ? (
                    <>
                        <div className="w-4 h-4 border-2 border-t-teal-400 border-gray-500 rounded-full animate-spin"></div>
                        <span>Đang tạo...</span>
                    </>
                ) : (
                    <>
                        <PlusCircleIcon />
                        <span>Kế hoạch chi tiết hơn</span>
                    </>
                )}
            </button>
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-200 rounded-md text-sm hover:bg-gray-500 hover:text-white font-semibold transition-colors"
            >
                <DownloadIcon/>
                <span>Tải về (.txt)</span>
            </button>
            <button
                onClick={onClose}
                className={`px-4 py-2 rounded-md text-sm text-white transition-colors font-semibold ${currentTheme.bg} ${currentTheme.bgHover}`}
            >
                Đóng
            </button>
         </footer>
      </div>
    </div>
  );
};

export default ChannelPlanModal;