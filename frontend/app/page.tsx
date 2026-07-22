'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<string>('Connecting to backend...');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://localhost:8080/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch backend');
        return res.text();
      })
      .then((data) => {
        setStatus(data);
        setError(false);
      })
      .catch((err) => {
        console.error(err);
        setStatus('Backend disconnected or unreachable.');
        setError(true);
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white font-sans">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-sm flex flex-col gap-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-400">
          CloudGuard Security Pipeline
        </h1>
        
        <div className="p-6 rounded-xl border border-gray-700 bg-gray-800 shadow-xl flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm font-medium">Backend Health Check:</p>
          <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            error ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
          }`}>
            {status}
          </div>
        </div>
      </div>
    </main>
  );
}
