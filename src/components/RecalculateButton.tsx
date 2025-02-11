'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { getMarksForRecalculation, updateCalculatedMarks } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { calculateMarksAndGrade } from '@/lib/formValidationSchemas';
import { calculateHigherMarksAndGrade } from '@/lib/markCalculations';

interface RecalculateButtonProps {
  type?: 'junior' | 'senior' | 'higher';
}

export default function RecalculateButton({ type = 'junior' }: RecalculateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const BATCH_SIZE = 50;

  const calculateBatch = (marks: any[], type: 'junior' | 'senior' | 'higher') => {
    return marks.map(mark => {
      switch (type) {
        case 'junior':
          const halfYearlyResults = mark.halfYearly ? calculateMarksAndGrade({
            examType: "HALF_YEARLY",
            halfYearly: mark.halfYearly
          }) : null;

          const yearlyResults = mark.yearly ? calculateMarksAndGrade({
            examType: "YEARLY",
            yearly: mark.yearly,
            halfYearly: mark.halfYearly
          }) : null;

          return {
            id: mark.id,
            halfYearly: halfYearlyResults && {
              id: mark.halfYearly.id,
              totalMarks: halfYearlyResults.totalMarks,
              grade: halfYearlyResults.grade
            },
            yearly: yearlyResults && {
              id: mark.yearly.id,
              totalMarks: yearlyResults.totalMarks,
              grade: yearlyResults.grade
            },
            grandTotalMarks: yearlyResults?.grandTotalMarks,
            grandTotalGrade: yearlyResults?.grandTotalGrade,
            overallPercentage: yearlyResults?.overallPercentage
          };

        case 'senior':
          const ptScores = [mark.pt1, mark.pt2, mark.pt3]
            .filter((score): score is number => score !== null)
            .sort((a, b) => b - a);
          
          const bestTwoPTAvg = ptScores.length >= 2 ? 
            (ptScores[0] + ptScores[1]) / 2 : null;

          const bestScore = bestTwoPTAvg !== null ? 
            bestTwoPTAvg + 
            (mark.multipleAssessment || 0) + 
            (mark.portfolio || 0) + 
            (mark.subEnrichment || 0) : null;

          const grandTotal = bestScore !== null && mark.finalExam !== null ?
            bestScore + mark.finalExam : null;

          let grade = null;
          if (grandTotal !== null) {
            if (grandTotal >= 91) grade = 'A1';
            else if (grandTotal >= 81) grade = 'A2';
            else if (grandTotal >= 71) grade = 'B1';
            else if (grandTotal >= 61) grade = 'B2';
            else if (grandTotal >= 51) grade = 'C1';
            else if (grandTotal >= 41) grade = 'C2';
            else if (grandTotal >= 33) grade = 'D';
            else grade = 'E';
          }

          return {
            id: mark.id,
            bestTwoPTAvg,
            bestScore,
            grandTotal,
            grade
          };

        case 'higher':
          const calculations = calculateHigherMarksAndGrade({
            unitTest1: mark.unitTest1,
            halfYearly: mark.halfYearly,
            unitTest2: mark.unitTest2,
            theory: mark.theory,
            practical: mark.practical
          });

          return {
            id: mark.id,
            ...calculations
          };

        default:
          return mark;
      }
    });
  };

  const handleClick = async () => {
    setIsLoading(true);
    setProgress(0);
    let page = 0;
    
    try {
      // Get first batch and total count
      const initialFetch = await getMarksForRecalculation(type, page, BATCH_SIZE);
      
      if (!initialFetch.success) {
        throw new Error(initialFetch.error);
      }

      const totalPages = Math.ceil(initialFetch.total / BATCH_SIZE);
      
      while (page < totalPages) {
        const response = await getMarksForRecalculation(type, page, BATCH_SIZE);
        
        if (!response.success || !response.data) {
          throw new Error('Failed to fetch marks batch');
        }

        const calculatedMarks = calculateBatch(response.data, type);
        const updateResult = await updateCalculatedMarks(type, calculatedMarks);
        
        if (!updateResult.success) {
          throw new Error('Failed to update marks batch');
        }

        page++;
        setProgress(Math.round((page / totalPages) * 100));
      }

      toast.success('Marks recalculation completed successfully');
      router.refresh();
    } catch (error) {
      console.error("Error in recalculation:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to recalculate marks');
    } finally {
      setIsLoading(false);
      setProgress(0);
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
      {isLoading && progress > 0 && (
        <div className="w-full max-w-xs">
          <div className="bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 text-center mt-1">{progress}%</p>
        </div>
      )}
    </div>
  );
}
