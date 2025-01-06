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

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await recalculateMarks(type);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error recalculating marks:", error);
      toast.error("Failed to recalculate marks");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? 'Recalculating...' : 'Recalculate Marks'}
    </button>
  );
}
