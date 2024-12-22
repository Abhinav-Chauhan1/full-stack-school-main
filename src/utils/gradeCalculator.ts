export const calculateGrade = (totalMarks: number): string => {
  if (totalMarks >= 91) return 'A1';
  if (totalMarks >= 81) return 'A2';
  if (totalMarks >= 71) return 'B1';
  if (totalMarks >= 61) return 'B2';
  if (totalMarks >= 51) return 'C1';
  if (totalMarks >= 41) return 'C2';
  if (totalMarks >= 33) return 'D';
  return 'E';
};

export const getGradeRemarks = (grade: string): string => {
  const remarks = {
    'A1': 'Outstanding Performance',
    'A2': 'Excellent Performance',
    'B1': 'Very Good Performance',
    'B2': 'Good Performance',
    'C1': 'Satisfactory Performance',
    'C2': 'Average Performance',
    'D': 'Below Average - Needs Improvement',
    'E': 'Needs Special Attention'
  };
  return remarks[grade as keyof typeof remarks] || '';
};
