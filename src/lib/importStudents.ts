'use server'
import { parse } from 'date-fns';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { studentSchema } from '@/lib/formValidationSchemas';

interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  successCount: number;
  failedRows: Array<{
    row: number;
    errors: string[];
  }>;
}

export const processExcelFile = async (file: File | Blob): Promise<ImportResult> => {
  try {
    const result: ImportResult = {
      success: false,
      message: '',
      totalRows: 0,
      successCount: 0,
      failedRows: [],
    };

    // Read the Excel file
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    result.totalRows = jsonData.length;

    // Process each row
    for (let index = 0; index < jsonData.length; index++) {
      const row = jsonData[index] as any;
      try {
        // Transform Excel data to match schema
        const studentData = {
          admissiondate: parse(row.admissiondate, 'dd/MM/yyyy', new Date()).toISOString(),
          admissionno: row.admissionno?.toString(),
          name: row.name,
          address: row.address,
          city: row.city,
          village: row.village,
          Sex: row.Sex,
          birthday: parse(row.birthday, 'dd/MM/yyyy', new Date()).toISOString(),
          nationality: row.nationality || 'Indian',
          Religion: row.Religion,
          tongue: row.tongue,
          category: row.category,
          mothername: row.mothername,
          mphone: row.mphone?.toString(),
          moccupation: row.moccupation,
          fathername: row.fathername,
          fphone: row.fphone?.toString(),
          foccupation: row.foccupation,
          aadharcard: row.aadharcard?.toString(),
          house: row.house,
          bloodgroup: row.bloodgroup,
          previousClass: row.previousClass,
          yearofpass: row.yearofpass?.toString(),
          board: row.board,
          school: row.school,
          grade: row.grade,
          classId: row.classId?.toString(),
          sectionId: row.sectionId?.toString(),
          sessionId: row.sessionId?.toString(),
        };

        // Validate data
        const validatedData = studentSchema.parse(studentData);

        // Check if student already exists
        const existingStudent = await prisma.student.findUnique({
          where: { admissionno: validatedData.admissionno },
        });

        if (existingStudent) {
          throw new Error('Student with this admission number already exists');
        }

        // Create student
        await prisma.student.create({
          data: {
            ...validatedData,
            document: '',
            tcdate: new Date(),
            tcNo: 0,
          },
        });

        result.successCount++;
      } catch (error: any) {
        result.failedRows.push({
          row: index + 2, // Add 2 to account for 1-based indexing and header row
          errors: Array.isArray(error.errors) 
            ? error.errors.map((e: any) => e.message)
            : [error.message || 'Unknown error'],
        });
      }
    }

    result.success = result.failedRows.length === 0;
    result.message = result.success 
      ? `Successfully imported ${result.successCount} students`
      : `Imported ${result.successCount} students with ${result.failedRows.length} errors`;

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to process Excel file: ' + error.message,
      totalRows: 0,
      successCount: 0,
      failedRows: [],
    };
  }
};