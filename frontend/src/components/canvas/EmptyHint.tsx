import React from 'react';

export const EmptyHint: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-6 z-10">
      <div className="max-w-md p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xs flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center text-xl font-bold">
          ⚡
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          Your Canvas is Empty
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Drag AWS services from the left component sidebar and drop them here to start building your security pipeline.
        </p>
      </div>
    </div>
  );
};
