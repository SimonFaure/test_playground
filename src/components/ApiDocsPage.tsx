import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { API_DOCUMENTATION } from '../services/api';

export function ApiDocsPage() {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<number>>(new Set([0]));

  const toggleEndpoint = (index: number) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEndpoints(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-blue-400" size={32} />
          <h1 className="text-3xl font-bold">API Documentation</h1>
        </div>

        <div className="mb-6 bg-slate-800/50 rounded-lg p-6">
          <p className="text-slate-300">
            This documentation describes all available API endpoints for the Taghunter Admin system.
            All endpoints use the base URL: <code className="px-2 py-1 bg-slate-700 rounded text-blue-300">https://admin.taghunter.fr/backend/api</code>
          </p>
        </div>

        <div className="space-y-4">
          {API_DOCUMENTATION.map((endpoint, index) => {
            const isExpanded = expandedEndpoints.has(index);

            return (
              <div key={index} className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                <button
                  onClick={() => toggleEndpoint(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-green-600 rounded text-xs font-bold">
                      {endpoint.method}
                    </span>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">{endpoint.name}</h3>
                      <p className="text-sm text-slate-400 font-mono">{endpoint.endpoint}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="text-slate-400" size={20} />
                  ) : (
                    <ChevronRight className="text-slate-400" size={20} />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">Description</h4>
                      <p className="text-slate-400">{endpoint.description}</p>
                    </div>

                    {endpoint.parameters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Parameters</h4>
                        <div className="space-y-3">
                          {endpoint.parameters.map((param, paramIndex) => (
                            <div key={paramIndex} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                              <div className="flex items-center gap-2 mb-2">
                                <code className="text-blue-300 font-mono font-semibold">{param.name}</code>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  param.required
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                }`}>
                                  {param.required ? 'required' : 'optional'}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-600 rounded text-xs font-mono text-slate-300">
                                  {param.type}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mb-2">{param.description}</p>
                              <div className="text-xs text-slate-500">
                                <span className="font-semibold">Example:</span>{' '}
                                <code className="text-slate-400">{param.example}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Response</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded border border-green-500/30">
                              Success (200)
                            </span>
                          </div>
                          <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                            <code className="text-sm text-green-300">
                              {JSON.stringify(endpoint.response.success, null, 2)}
                            </code>
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded border border-red-500/30">
                              Error (4xx/5xx)
                            </span>
                          </div>
                          <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                            <code className="text-sm text-red-300">
                              {JSON.stringify(endpoint.response.error, null, 2)}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">Example Request</h4>
                      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto border border-slate-700">
                        <code className="text-sm text-slate-300">
{`fetch('https://admin.taghunter.fr/backend/api${endpoint.endpoint}${
  endpoint.parameters.length > 0
    ? `?${endpoint.parameters.map(p => `${p.name}=${encodeURIComponent(p.example)}`).join('&')}`
    : ''
}', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log(data));`}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
