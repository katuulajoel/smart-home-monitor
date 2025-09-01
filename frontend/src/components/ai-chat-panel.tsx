// src/components/ai-chat-panel.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatClient } from '@/lib/api-client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  timestamp?: Date; // For backward compatibility
}

const MESSAGES_PER_PAGE = 10;

export default function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState<string>(() => uuidv4());

  const fetchChatHistory = useCallback(async (before?: string) => {
    try {
      const params = new URLSearchParams({
        limit: MESSAGES_PER_PAGE.toString(),
      });
      
      if (before) {
        params.append('before', before);
      }

      const { data } = await chatClient.get(`/history?${params.toString()}`);
      
      // Transform API response to match our Message type
      const formattedMessages = data.messages
        .map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt)
        }))
        .reverse(); // Reverse to maintain chronological order

      setMessages(prev => before ? [...formattedMessages, ...prev] : formattedMessages);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, []);

  useEffect(() => {
    // Load initial messages
    fetchChatHistory();
  }, [fetchChatHistory]);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    
    const container = messagesStartRef.current;
    if (!container) return;
    
    // Save current scroll position and height
    const scrollPosition = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    
    setIsLoadingMore(true);
    await fetchChatHistory(messages[0].createdAt);
    
    // Restore scroll position after messages are loaded
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - scrollHeight + scrollPosition;
      }
    });
    
    setIsLoadingMore(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await chatClient.post('/message', {
        message: input,
        sessionId,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <span className="sr-only">Close panel</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4" ref={messagesStartRef}>
        {hasMore && (
          <div className="flex justify-center my-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}
        
        {messages.map((message) => {
          const timestamp = message.timestamp || new Date(message.createdAt);
          return (
            <div
              key={message.id}
              className={`mb-4 p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-50 text-blue-800 ml-8' 
                  : 'bg-gray-50 text-gray-800 mr-8'
              }`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(timestamp).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}