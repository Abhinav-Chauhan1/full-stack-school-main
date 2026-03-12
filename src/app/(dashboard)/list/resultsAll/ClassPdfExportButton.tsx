'use client';

import { useState } from 'react';
import { fetchClassResultsForPdf } from './actions';
import { generateAndDownloadClassResultPdf } from '@/lib/classResultPdfUtils';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface ClassPdfExportButtonProps {
    sessionId: number;
    classId: number;
    sectionId: number;
}

export default function ClassPdfExportButton({ sessionId, classId, sectionId }: ClassPdfExportButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const data = await fetchClassResultsForPdf(sessionId, classId, sectionId);
            await generateAndDownloadClassResultPdf(
                data.sessionCode,
                data.className,
                data.sectionName,
                data.students
            );
            toast.success('Class PDF exported successfully');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Failed to export class PDF');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
            title="Export Class PDF Summary"
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Export to PDF
                </>
            )}
        </button>
    );
}
