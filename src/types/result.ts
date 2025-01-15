export interface StudentResult {
  student: {
    name: string;
    birthday: Date;
    Class: { name: string };
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
      yearlytotalMarks: number | null;
      yearlygrade: string | null;
      yearlyremarks: string | null;
    } | null;
    grandTotalMarks: number | null;
    grandTotalGrade: string | null;
    overallPercentage: number | null;
  }>;
  session: {
    sessioncode: string;
    sessionfrom: Date;
    sessionto: Date;
  };
}

export interface StudentResult11 {
  student: {
    name: string;
    birthday: Date;
    Class: { name: string };
    Section: { name: string };
    admissionno: number;
    mothername: string;
    fathername: string;
    address: string;
    city: string;
    village: string;
    img?: string;
  };
  marksHigher: Array<{
    unitTest1: number | null;
    halfYearly: number | null;
    unitTest2: number | null;
    theory: number | null;
    practical: number | null;
    totalWithout: number | null;
    grandTotal: number | null;
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
  }>;
  session: {
    sessioncode: string;
    sessionfrom: Date;
    sessionto: Date;
  };
}
