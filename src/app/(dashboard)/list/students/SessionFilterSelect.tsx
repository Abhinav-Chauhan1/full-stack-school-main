'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Session {
  id: number;
  sessioncode: string;
  sessionfrom: Date;
  sessionto: Date;
  isActive: boolean;
}

interface SessionFilterSelectProps {
  sessions: Session[];
  selectedSessionId?: string;
}

const SessionFilterSelect = ({ sessions, selectedSessionId }: SessionFilterSelectProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set('sessionId', value);
    } else {
      params.delete('sessionId');
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <select
      className="px-2 py-1 border rounded"
      onChange={(e) => handleChange(e.target.value)}
      value={selectedSessionId || ''}
    >
      <option value="">All Sessions</option>
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.sessioncode} {session.isActive ? '(Active)' : ''}
        </option>
      ))}
    </select>
  );
};

export default SessionFilterSelect;
