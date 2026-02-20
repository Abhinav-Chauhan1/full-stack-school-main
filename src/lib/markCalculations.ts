import { HigherMarkSchema } from './formValidationSchemas';

export const calculateHigherMarksAndGrade = (mark: any) => {
  // Check if it's a painting subject
  const isPaintingSubject = mark.subjectCode === 'PAI02';
  
  let totalWithout = 0;
  let grandTotal = 0;

  if (isPaintingSubject) {
    // For PAI02 subject (Painting)
    const theory30 = mark.theory30 || 0;
    const practical70 = mark.practical70 || 0;
    
    totalWithout = theory30;
    grandTotal = theory30 + practical70;
  } else {
    // For regular subjects
    // Unit Test 1: 10 marks
    // Half Yearly: 30 marks
    // Unit Test 2: 10 marks
    // Theory: 30 marks (updated from 35)
    // Practical: 20 marks (updated from 15)
    // Total: 100 marks
    const unitTest1 = mark.unitTest1 || 0;
    const halfYearly = mark.halfYearly || 0;
    const unitTest2 = mark.unitTest2 || 0;
    const theory = mark.theory || 0;
    const practical = mark.practical || 0;
    
    // Total without practical = 80 marks (10+30+10+30)
    totalWithout = unitTest1 + halfYearly + unitTest2 + theory;
    // Grand total = 100 marks (80+20)
    grandTotal = totalWithout + practical;
  }

  // Calculate percentage (out of 100)
  const percentage = Math.round(grandTotal);

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
