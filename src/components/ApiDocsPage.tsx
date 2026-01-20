import { BookOpen } from 'lucide-react';

export function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-blue-400" size={32} />
          <h1 className="text-3xl font-bold">API Documentation</h1>
        </div>

        <div className="mb-6 bg-slate-800/50 rounded-lg p-6">
          <p className="text-slate-300">
            API functionality has been removed. Scenarios are now loaded from local folders on the computer.
          </p>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-white mb-2">Local Scenario Storage</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>Windows:</strong> C:\ProgramData\Taghunter\scenarios\scenarios.json</li>
              <li><strong>macOS:</strong> /Library/Application Support/Taghunter/scenarios/scenarios.json</li>
              <li><strong>Linux:</strong> /usr/share/taghunter/scenarios/scenarios.json</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
