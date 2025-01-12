import { type Prisma } from '@prisma/client';

export function excelDateToJSDate(excelDate: number) {
  // Excel dates are number of days since 1900-01-01
  // Need to adjust for Excel's leap year bug in 1900
  const unixTimestamp = (excelDate - 25569) * 86400 * 1000;
  return new Date(unixTimestamp);
}

export function convertExcelDates(studentData: any) {
  const dateFields = ['admissiondate', 'birthday', 'tcdate'];
  
  const converted = { ...studentData };
  for (const field of dateFields) {
    if (typeof converted[field] === 'number') {
      converted[field] = excelDateToJSDate(converted[field]);
    }
  }
  
  return converted;
}

export function convertPhoneNumbers(studentData: any) {
  const phoneFields = ['mphone', 'fphone'];
  
  const converted = { ...studentData };
  for (const field of phoneFields) {
    if (typeof converted[field] === 'number') {
      converted[field] = converted[field].toString();
    }
  }
  
  return converted;
}

const VALID_STUDENT_FIELDS = [
  'admissiondate',
  'admissionno',
  'name',
  'address',
  'city',
  'village',
  'Sex',
  'birthday',
  'nationality',
  'Religion',
  'tongue',
  'category',
  'subcategoryId',
  'mothername',
  'mphone',
  'moccupation',
  'fathername',
  'fphone',
  'foccupation',
  'aadharcard',
  'house',
  'bloodgroup',
  'previousClass',
  'yearofpass',
  'board',
  'school',
  'grade',
  'document',
  'tc',
  'tcdate',
  'tcNo',
  'img'
];

function cleanupStudentData(studentData: any) {
  const cleanData: { [key: string]: any } = {};
  
  for (const field of VALID_STUDENT_FIELDS) {
    if (studentData[field] !== undefined) {
      cleanData[field] = studentData[field];
    }
  }
  
  return cleanData;
}

export function convertStudentData(student: any): Omit<Prisma.StudentCreateInput, 'Class' | 'Section'> {
  const withDates = convertExcelDates(student);
  const withPhones = convertPhoneNumbers(withDates);
  
  // Convert aadharcard to string if it exists
  if (typeof withPhones.aadharcard === 'number') {
    withPhones.aadharcard = withPhones.aadharcard.toString();
  }
  
  // Clean up data by removing unknown fields
  const cleanedData = cleanupStudentData(withPhones);

  return {
    admissiondate: cleanedData.admissiondate,
    admissionno: cleanedData.admissionno,
    name: cleanedData.name,
    address: cleanedData.address,
    category: cleanedData.category,
    Sex: cleanedData.Sex,
    birthday: cleanedData.birthday,
    city: cleanedData.city,
    village: cleanedData.village,
    nationality: cleanedData.nationality,
    Religion: cleanedData.Religion,
    tongue: cleanedData.tongue,
    mothername: cleanedData.mothername,
    mphone: cleanedData.mphone,
    moccupation: cleanedData.moccupation,
    fathername: cleanedData.fathername,
    fphone: cleanedData.fphone,
    foccupation: cleanedData.foccupation,
    aadharcard: cleanedData.aadharcard,
    house: cleanedData.house,
    bloodgroup: cleanedData.bloodgroup,
    previousClass: cleanedData.previousClass,
    yearofpass: cleanedData.yearofpass,
    board: cleanedData.board,
    school: cleanedData.school,
    grade: cleanedData.grade,
    document: cleanedData.document,
    tc: cleanedData.tc,
    tcdate: cleanedData.tcdate,
    tcNo: cleanedData.tcNo,
    img: cleanedData.img
  };
}
