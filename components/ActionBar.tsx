import React from 'react';
import { DownloadIcon, TrashIcon } from './icons/Icons';

interface ActionBarProps {
    savedCount: number;
    onExport: () => void;
    onClearSaved: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ savedCount, onExport, onClearSaved }) => {
    return (
        <div className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 mb-6 flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-300">
                <span className="font-bold">{savedCount}</span> ý tưởng đã được lưu.
            </p>
            <div className="flex items-center gap-3">
                <button
                    onClick={onClearSaved}
                    disabled={savedCount === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/80 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <TrashIcon />
                    <span>Xóa tất cả</span>
                </button>
                <button
                    onClick={onExport}
                    disabled={savedCount === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    <DownloadIcon />
                    <span>Xuất File Excel</span>
                </button>
            </div>
        </div>
    );
};

export default ActionBar;