// app/api/students/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processExcelFile } from '@/lib/excelProcessor';

export async function POST(request: NextRequest) {
  console.log('API route started');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    console.log('File received:', file ? 'yes' : 'no');
    console.log('File type:', file instanceof Blob ? 'Blob' : typeof file);

    if (!file || !(file instanceof Blob)) {
      console.log('No valid file uploaded');
      return NextResponse.json({
        success: false,
        message: 'No file uploaded',
        totalRows: 0,
        successCount: 0,
        failedRows: []
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate file type
    const fileName = (file as File).name?.toLowerCase() || '';
    console.log('Filename:', fileName);

    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      console.log('Invalid file type');
      return NextResponse.json({
        success: false,
        message: 'Invalid file format. Only .xlsx and .xls files are allowed',
        totalRows: 0,
        successCount: 0,
        failedRows: []
      }, {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    console.log('Processing file...');
    const result = await processExcelFile(file);
    console.log('Process result:', result);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      totalRows: 0,
      successCount: 0,
      failedRows: []
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}