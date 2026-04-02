'use client';

import { useState } from 'react';
import { exportSeniorResultsToExcel, fetchClass9ResultsForPdf } from './actions';
import { generateAndDownloadClass9ResultPdf } from '@/lib/classResultPdfUtils9';
import { toast } from 'react-toastify';

interface Props { sessionId: number; classId: number; sectionId: number; }

const Spinner = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

export default function Class9ExportButtons({ sessionId, classId, sectionId }: Props) {
    const [pdfLoading, setPdfLoading] = useState(false);
    const [xlLoading, setXlLoading] = useState(false);

    const handlePdf = async () => {
        setPdfLoading(true);
        try {
            const data = await fetchClass9ResultsForPdf(sessionId, classId, sectionId);
            await generateAndDownloadClass9ResultPdf(data.sessionCode, data.className, data.sectionName, data.students);
            toast.success('PDF exported successfully');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to export PDF');
        } finally { setPdfLoading(false); }
    };

    const handleExcel = async () => {
        setXlLoading(true);
        try {
            const base64 = await exportSeniorResultsToExcel(sessionId, classId, sectionId);
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'class9-results.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('Excel exported successfully');
        } catch (e) {
            toast.error('Failed to export Excel');
        } finally { setXlLoading(false); }
    };

    return (
        <>
            <button onClick={handlePdf} disabled={pdfLoading}
                className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm">
                {pdfLoading ? <><Spinner /> Exporting...</> : 'Export to PDF'}
            </button>
            <button onClick={handleExcel} disabled={xlLoading}
                className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm">
                {xlLoading ? <><Spinner /> Exporting...</> : 'Export to Excel'}
            </button>
        </>
    );
}
