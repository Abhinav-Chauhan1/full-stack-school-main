export interface CoScholasticData {
  term1ValueEducation?: string | null;
  term1PhysicalEducation?: string | null;
  term1ArtCraft?: string | null;
  term1Discipline?: string | null;
  term2ValueEducation?: string | null;
  term2PhysicalEducation?: string | null;
  term2ArtCraft?: string | null;
  term2Discipline?: string | null;
}

export interface StudentResult {
  student: {
    name: string;
    birthday: Date;
    Class: { name: string; classNumber: number };
    Section: { name: string };
    admissionno: number;
    mothername: string;
    moccupation: string;
    fathername: string;
    foccupation: string;
    address: string;
    city: string;
    village: string;
    bloodgroup: string;
    img?: string;
  };
  marksJunior?: Array<{
    classSubject: {
      subject: { name: string; code: string; };
    };
    halfYearly: {
      ut1: number | null;
      ut2: number | null;
      noteBook: number | null;
      subEnrichment: number | null;
      examMarks: number | null;
      examMarks40: number | null;
      examMarks30: number | null;
      totalMarks: number | null;
      grade: string | null;
      remarks: string | null;
    } | null;
    yearly: {
      ut3: number | null;
      ut4: number | null;
      yearlynoteBook: number | null;
      yearlysubEnrichment: number | null;
      yearlyexamMarks: number | null;
      yearlyexamMarks40: number | null;
      yearlyexamMarks30: number | null;
      yearlytotalMarks: number | null;
      yearlygrade: string | null;
      yearlyremarks: string | null;
    } | null;
    grandTotalMarks: number | null;
    grandTotalGrade: string | null;
    overallPercentage: number | null;
    coScholastic?: {
      term1ValueEducation: string | null;
      term1PhysicalEducation: string | null;
      term1ArtCraft: string | null;
      term1Discipline: string | null;
      term2ValueEducation: string | null;
      term2PhysicalEducation: string | null;
      term2ArtCraft: string | null;
      term2Discipline: string | null;
    };
  }>;
  marksSenior?: Array<{
    pt1: number | null;
    pt2: number | null;
    pt3: number | null;
    bestTwoPTAvg: number | null;
    multipleAssessment: number | null;
    portfolio: number | null;
    subEnrichment: number | null;
    bestScore: number | null;
    finalExam: number | null;
    grandTotal: number | null;
    grade: string | null;
    remarks: string | null;
    theory?: number | null;
    practical?: number | null;
    total?: number | null;
    sectionSubject: {
      subject: {
        name: string;
        code: string;
      };
    };
  }>;
  marksHigher?: Array<{
    unitTest1: number | null;
    halfYearly: number | null;
    unitTest2: number | null;
    theory: number | null;
    practical: number | null;
    totalWithout: number | null;
    grandTotal: number | null;
    overallGrade: string | null;
    total: number | null;
    percentage: number | null;
    grade: string | null;
    remarks: string | null;
    sectionSubject: {
      subject: {
        name: string;
        code: string;
      };
    };
    coScholastic?: {
      physicalEducation: string | null;
      workExperience: string | null;
      discipline: string | null;
    };
  }>;
  session: {
    sessioncode: string;
    sessionfrom: Date;
    sessionto: Date;
  };
}

export interface StudentResult11 {
  student: {
    id: string;
    name: string;
    admissionno: string | number;
    birthday: Date;
    mothername?: string;
    fathername?: string;
    address?: string;
    img?: string;
    Class: {
      name: string;
    };
    Section: {
      name: string;
    };
  };
  marksHigher: Array<{
    id: number;
    unitTest1?: number;
    halfYearly?: number;
    unitTest2?: number;
    theory?: number;
    practical?: number;
    theory30?: number;  // Added field for PAI02 subject
    practical70?: number; // Added field for PAI02 subject
    totalWithout?: number;
    grandTotal?: number;
    sectionSubject: {
      subject: {
        name: string;
        code: string;
      };
    };
    coScholastic?: {
      physicalEducation?: string;
      workExperience?: string;
      discipline?: string;
    };
  }>;
  session: {
    sessioncode: string;
    sessionfrom: Date;
    sessionto: Date;
  };
}
