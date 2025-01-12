import { HigherMarkSchema } from './formValidationSchemas';

export const calculateHigherMarksAndGrade = (markData: Partial<HigherMarkSchema>) => {
  if (!markData) {
    return {
      totalWithout: null,
      grandTotal: null,
      total: null,
      percentage: null,
      grade: null,
      overallGrade: null
    };
  }

  // Validate and normalize input values (ensure they're within limits)
  const unitTest1 = typeof markData.unitTest1 === 'number' ? Math.min(10, Math.max(0, markData.unitTest1)) : null;
  const halfYearly = typeof markData.halfYearly === 'number' ? Math.min(30, Math.max(0, markData.halfYearly)) : null;
  const unitTest2 = typeof markData.unitTest2 === 'number' ? Math.min(10, Math.max(0, markData.unitTest2)) : null;
  const theory = typeof markData.theory === 'number' ? Math.min(35, Math.max(0, markData.theory)) : null;
  const practical = typeof markData.practical === 'number' ? Math.min(15, Math.max(0, markData.practical)) : null;

  // Calculate total without practical
  const totalWithout = (
    (unitTest1 || 0) + 
    (halfYearly || 0) + 
    (unitTest2 || 0) + 
    (theory || 0)
  );

  // Calculate grand total including practical
  const grandTotal = totalWithout + (practical || 0);

  // Calculate percentage (out of 100)
  const percentage = Math.round((grandTotal / 100) * 100);

  // Determine grade based on percentage
  let grade = null;
  if (grandTotal !== null) {
    if (percentage >= 91) grade = 'A1';
    else if (percentage >= 81) grade = 'A2';
    else if (percentage >= 71) grade = 'B1';
    else if (percentage >= 61) grade = 'B2';
    else if (percentage >= 51) grade = 'C1';
    else if (percentage >= 41) grade = 'C2';
    else if (percentage >= 33) grade = 'D';
    else grade = 'E';
  }

  return {
    totalWithout,
    grandTotal,
    total: grandTotal,
    percentage,
    grade,
    overallGrade: grade
  };
};
