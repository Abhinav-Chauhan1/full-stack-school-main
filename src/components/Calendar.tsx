'use client';

import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const Calendar = () => {
  const formats = {
    monthHeaderFormat: (date: Date) => {
      return format(date, 'MMMM yyyy').toString();
    }
  };

  return (
    <div className="h-full bg-white rounded-xl p-4 shadow-sm">
      <BigCalendar
        localizer={localizer}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={['month']}
        defaultView="month"
        formats={formats}
        className="custom-calendar"
      />
      <style jsx global>{`
        .custom-calendar {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .custom-calendar .rbc-today {
          background-color: #dbeafe;
        }
        .custom-calendar .rbc-header {
          background-color: #60a5fa;
          color: white;
          padding: 12px;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 0.875rem;
        }
        .custom-calendar .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .custom-calendar .rbc-event {
          background-color: #fbbf24;
          border-radius: 4px;
          border: none;
          padding: 4px;
        }
        .custom-calendar .rbc-month-view {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .custom-calendar .rbc-toolbar button {
          color: #1f2937;
          border-radius: 6px;
          padding: 8px 16px;
          font-weight: 500;
        }
        .custom-calendar .rbc-toolbar button:hover {
          background-color: #60a5fa;
          color: white;
        }
        .custom-calendar .rbc-toolbar {
          margin-bottom: 16px;
        }
        .custom-calendar .rbc-date-cell {
          padding: 4px;
          font-weight: 500;
        }
        .custom-calendar .rbc-today .rbc-button-link {
          color: #2563eb;
          font-weight: 600;
        }
        .custom-calendar .rbc-toolbar-label {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
};

export default Calendar;
