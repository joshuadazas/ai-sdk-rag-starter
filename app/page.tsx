'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { DocumentUpload } from '@/components/DocumentUpload';

// Sample prompts for users to quickly start conversations
const SAMPLE_PROMPTS = [
  {
    icon: '🔐',
    title: 'Security Policies',
    prompt: 'What are the key security policies in our knowledge base?',
  },
  {
    icon: '📋',
    title: 'Compliance Requirements',
    prompt: 'Tell me about ISO 27001 compliance requirements.',
  },
  {
    icon: '🛡️',
    title: 'Data Protection',
    prompt: 'What are the data protection and privacy guidelines?',
  },
  {
    icon: '⚠️',
    title: 'Incident Response',
    prompt: 'How should we handle security incidents?',
  },
];

export default function Chat() {
  const [input, setInput] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const { messages, sendMessage, status } = useChat();

  // Derive loading state from status
  const isLoading = status === 'submitted' || status === 'streaming';

  const handlePromptClick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const getToolLabel = (toolType: string) => {
    switch (toolType) {
      case 'tool-addResource':
        return '📝 Adding Resource';
      case 'tool-getInformation':
        return '🔍 Searching Knowledge Base';
      default:
        return '⚙️ Processing';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {/* Upload Toggle Button - Fixed at top */}
      <div className="fixed top-4 right-4 z-10">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>{showUpload ? '💬' : '📤'}</span>
          <span>{showUpload ? 'Back to Chat' : 'Upload Document'}</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Upload Section */}
        {showUpload ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Document
              </h1>
              <p className="text-gray-600">
                Add documents to your knowledge base
              </p>
            </div>
            <DocumentUpload />
          </div>
        ) : (
          <>
            {/* Welcome Section with Sample Prompts */}
            {messages.length === 0 && (
          <div className="text-center space-y-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to Audit Assistant
              </h1>
              <p className="text-gray-600">
                Ask questions about Ontop&apos;s policies and procedures or try one of these:
              </p>
            </div>

            {/* Sample Prompt Cards */}
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_PROMPTS.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(sample.prompt)}
                  disabled={isLoading}
                  className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white"
                >
                  <div className="text-2xl mb-2">{sample.icon}</div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                    {sample.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold mb-2 text-sm uppercase tracking-wide text-gray-700">
                {m.role}
              </div>
              {m.parts.map((part, index) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <p key={index} className="text-gray-900 leading-relaxed">
                        {part.text}
                      </p>
                    );
                  case 'tool-addResource':
                  case 'tool-getInformation':
                    const isToolLoading = part.state !== 'output-available';

                    return (
                      <div
                        key={index}
                        className="my-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm"
                      >
                        {/* Tool Header */}
                        <div className="flex items-center gap-2 mb-3">
                          {isToolLoading && (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                          )}
                          <span className="font-medium text-blue-900 text-sm">
                            {getToolLabel(part.type)}
                          </span>
                          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                            isToolLoading
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {isToolLoading ? 'Processing...' : 'Complete'}
                          </span>
                        </div>

                        {/* Skeleton Loader */}
                        {isToolLoading ? (
                          <div className="space-y-2 animate-pulse">
                            <div className="h-3 bg-blue-200 rounded w-3/4"></div>
                            <div className="h-3 bg-blue-200 rounded w-1/2"></div>
                            <div className="h-3 bg-blue-200 rounded w-5/6"></div>
                            <div className="h-3 bg-blue-200 rounded w-2/3"></div>
                          </div>
                        ) : (
                          /* Tool Results */
                          <>
                            {/* Input Parameters */}
                            <details className="group">
                              <summary className="cursor-pointer text-xs font-medium text-blue-700 hover:text-blue-900 list-none flex items-center gap-1">
                                <span className="transform transition-transform group-open:rotate-90">▶</span>
                                View Parameters
                              </summary>
                              <pre className="mt-2 bg-white p-3 rounded text-xs overflow-auto border border-blue-100">
                                {String('input' in part && part.input ? JSON.stringify(part.input, null, 2) : 'No input')}
                              </pre>
                            </details>

                            {/* Output Results */}
                            {'output' in part && part.output && (
                              <details className="group" open>
                                <summary className="cursor-pointer text-xs font-medium text-blue-700 hover:text-blue-900 list-none flex items-center gap-1">
                                  <span className="transform transition-transform group-open:rotate-90">▶</span>
                                  Results
                                </summary>
                                <pre className="mt-2 bg-white p-3 rounded text-xs overflow-auto border border-blue-100 max-h-64">
                                  {String(JSON.stringify(part.output, null, 2))}
                                </pre>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                    );
                }
              })}
            </div>
          </div>
        ))}

        {/* Global Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </div>
            <span className="text-sm text-gray-600">AI is thinking...</span>
          </div>
        )}

        {/* Quick Actions - Show when there are messages */}
        {messages.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Quick Questions:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(sample.prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-700 flex items-center gap-1.5"
                >
                  <span>{sample.icon}</span>
                  <span>{sample.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Chat Input Form - Hide when upload is shown */}
      {!showUpload && (
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage({ text: input });
            setInput('');
          }}
        >
          <input
            disabled={isLoading}
            className={`fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl transition-opacity ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            value={input}
            placeholder="Say something..."
            onChange={e => setInput(e.currentTarget.value)}
          />
        </form>
      )}
    </div>
  );
}