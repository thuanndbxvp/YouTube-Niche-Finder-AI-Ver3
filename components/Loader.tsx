
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="w-12 h-12 border-4 border-t-teal-400 border-gray-600 rounded-full animate-spin"></div>
      <p className="text-gray-400 font-semibold">AI đang phân tích... vui lòng chờ.</p>
    </div>
  );
};

export default Loader;