'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { recalculateMarks } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface RecalculateButtonProps {
  type?: 'junior' | 'senior' | 'higher';
}

export default function RecalculateButton({ type = 'junior' }: RecalculateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = async () => {
    setIsLoading(true);
    setProgress(0);

    try {
      const startRecalculation = async () => {
        const result = await recalculateMarks(type);
        
        if (!result) {
          throw new Error('No response from recalculation');
        }

        if (result.success) {
          setProgress(result.progress || 0);
          
          if (result.progress < 100) {
            // Continue processing if not complete
            await startRecalculation();
          } else {
            toast.success(result.message || "Recalculation completed");
            router.refresh();
            setIsLoading(false);
          }
        } else {
          throw new Error(result.message || "Failed to recalculate marks");
        }
      };

      await startRecalculation();
    } catch (error) {
      console.error("Error recalculating marks:", error);
      toast.error(error instanceof Error ? error.message : "Failed to recalculate marks");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Recalculating...' : 'Recalculate Marks'}
      </button>
      
      {isLoading && (
        <div className="w-full max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-center mt-1">{progress}% Complete</p>
        </div>
      )}
    </div>
  );
}
