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

export function convertStudentData(student: any): Omit<Prisma.StudentCreateInput, 'Class' | 'Section' | 'Session'> {
  const withDates = convertExcelDates(student);
  const withPhones = convertPhoneNumbers(withDates);
  
  // Convert aadharcard to string if it exists
  if (typeof withPhones.aadharcard === 'number') {
    withPhones.aadharcard = withPhones.aadharcard.toString();
  }
  
  // Clean up data by removing unknown fields
  const cleanedData = cleanupStudentData(withPhones);

  // Convert date strings to Date objects
  let admissiondate: Date;
  let birthday: Date;

  try {
    // Handle Excel dates or date strings
    if (cleanedData.admissiondate) {
      admissiondate = new Date(cleanedData.admissiondate);
      if (isNaN(admissiondate.getTime())) {
        throw new Error(`Invalid admission date format for student ${cleanedData.name}`);
      }
    } else {
      throw new Error(`Missing admission date for student ${cleanedData.name}`);
    }

    if (cleanedData.birthday) {
      birthday = new Date(cleanedData.birthday);
      if (isNaN(birthday.getTime())) {
        throw new Error(`Invalid birth date format for student ${cleanedData.name}`);
      }
    } else {
      throw new Error(`Missing birth date for student ${cleanedData.name}`);
    }
  } catch (error) {
    throw new Error(`Date conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Return the converted data with proper types
  return {
    ...cleanedData,
    admissiondate, // Now guaranteed to be a Date
    birthday, // Now guaranteed to be a Date
    // Ensure numeric fields are properly converted
    admissionno: typeof cleanedData.admissionno === 'string' ? 
      parseInt(cleanedData.admissionno) : 
      cleanedData.admissionno,
    yearofpass: cleanedData.yearofpass ? 
      parseInt(cleanedData.yearofpass.toString()) : 
      undefined,
    // Handle optional phone numbers
    mphone: cleanedData.mphone?.toString() || undefined,
    fphone: cleanedData.fphone?.toString() || undefined,
    // Ensure other required fields are present
    name: cleanedData.name || '',
    Sex: cleanedData.Sex || '',
    address: cleanedData.address || '',
    city: cleanedData.city || '',
    village: cleanedData.village || '',
    Religion: cleanedData.Religion || '',
    tongue: cleanedData.tongue || '',
    category: cleanedData.category || '',
    bloodgroup: cleanedData.bloodgroup || '',
  };
}
