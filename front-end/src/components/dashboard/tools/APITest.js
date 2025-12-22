import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const APITest = () => {
  const [testPrompt, setTestPrompt] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [apiConfig, setApiConfig] = useState({
    url: 'http://localhost:3001/api/chat',
    key: 'Backend API (configured)'
  });

  // Debug: Log environment variables
  console.log('API Configuration Debug:', {
    backendUrl: 'http://localhost:3001/api/chat',
    usingBackend: true,
    NODE_ENV: process.env.NODE_ENV
  });

  const testAPI = async () => {
    if (!testPrompt.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const backendUrl = 'http://localhost:3001';

      console.log('Testing Backend API with:', {
        url: backendUrl,
        prompt: testPrompt
      });

      // Test 1: Health check
      const healthResponse = await fetch(`${backendUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Server health check failed: ${healthResponse.status}`);
      }
      const healthData = await healthResponse.json();

      // Test 2: Public currency endpoint
      const currencyResponse = await fetch(`${backendUrl}/api/currency/rates?base=USD`);
      if (!currencyResponse.ok) {
        throw new Error(`Currency API failed: ${currencyResponse.status}`);
      }
      const currencyData = await currencyResponse.json();

      // Test 3: Document converter info
      const docResponse = await fetch(`${backendUrl}/api/documents/supported`);
      if (!docResponse.ok) {
        throw new Error(`Document API failed: ${docResponse.status}`);
      }
      const docData = await docResponse.json();

      setTestResult({
        success: true,
        status: 200,
        data: {
          health: healthData,
          currency: currencyData,
          documents: docData,
          prompt: testPrompt,
          message: 'All public APIs are working! Chat functionality requires authentication.'
        },
        message: 'Backend API connection successful!'
      });

    } catch (error) {
      console.error('API Test Error:', error);
      setTestResult({
        success: false,
        error: error.message,
        message: 'API call failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
              <AlertCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">API Connectivity Test</h1>
              <p className="text-gray-400 text-sm">Verify your connection to the Omni-AI backend</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
            Developer Tool
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="p-6 border-b border-white/5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Current Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <label className="text-xs text-gray-500 mb-2 block font-medium">API Endpoint</label>
            <code className="text-sm text-gray-300 font-mono break-all inline-block bg-black/40 px-2 py-1 rounded">
              {apiConfig.url || 'Not configured'}
            </code>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <label className="text-xs text-gray-500 mb-2 block font-medium">Status</label>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <code className="text-sm text-gray-300 font-mono">
                System Active
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="flex-1 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test API Call</h3>

        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Test Prompt</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt for image generation..."
              className="flex-1 p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20"
              onKeyPress={(e) => e.key === 'Enter' && testAPI()}
            />
            <button
              onClick={testAPI}
              disabled={!testPrompt.trim() || isTesting}
              className="px-6 py-4 rounded-xl bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isTesting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Test API
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${testResult.success
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-[var(--primary)]/10 border-[var(--primary)]/20'
              }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-[var(--primary)]" />
              )}
              <h4 className={`font-semibold ${testResult.success ? 'text-green-400' : 'text-[var(--primary)]'
                }`}>
                {testResult.message}
              </h4>
            </div>

            {testResult.success ? (
              <div>
                <p className="text-sm text-gray-300 mb-2">
                  Status: <span className="text-green-400">{testResult.status}</span>
                </p>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <pre className="text-xs text-gray-300 overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[var(--primary)] mb-2">
                  Error: {testResult.error}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <h4 className="text-blue-400 font-semibold mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Make sure the backend server is running on <code className="bg-gray-800/50 px-1 rounded">http://localhost:3001</code></li>
            <li>Create a <code className="bg-gray-800/50 px-1 rounded">.env</code> file in the <code className="bg-gray-800/50 px-1 rounded">omni-master</code> directory</li>
            <li>Add OpenRouter API key: <code className="bg-gray-800/50 px-1 rounded">OPENROUTER_API_KEY=s2_ff4476315f0745b2a3313395cdba4faa</code></li>
            <li>Add other required API keys (OpenAI, Stability AI, etc.) as needed</li>
            <li>Restart the backend server</li>
            <li>Test the API connection above (tests public endpoints)</li>
          </ol>

          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <h5 className="text-yellow-400 font-semibold mb-1">For Chat Testing:</h5>
            <p className="text-sm text-gray-300">
              Chat functionality requires authentication. To test chat features:
            </p>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside mt-2">
              <li>Register a user: <code className="bg-gray-800/50 px-1 rounded">POST /api/users/register</code></li>
              <li>Login to get JWT token: <code className="bg-gray-800/50 px-1 rounded">POST /api/users/login</code></li>
              <li>Use token in Authorization header: <code className="bg-gray-800/50 px-1 rounded">Bearer YOUR_TOKEN</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APITest;
