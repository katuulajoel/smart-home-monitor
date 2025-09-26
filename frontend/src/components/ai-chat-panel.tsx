// src/components/ai-chat-panel.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatClient } from '@/lib/api-client';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  timestamp?: Date;
}

const MESSAGES_PER_PAGE = 10;

export default function AIChatPanel({ onClose }: { onClose: () => void }) {
  const { selectedModel } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      
      const formattedMessages = data.messages
        .map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt)
        }))
        .reverse();

      setMessages(prev => before ? [...formattedMessages, ...prev] : formattedMessages);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, []);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const loadMoreMessages = useCallback(() => {
    if (messages.length === 0 || !hasMore) return;
    
    const oldestMessage = messages[0];
    if (oldestMessage?.createdAt) {
      setIsLoadingMore(true);
      fetchChatHistory(oldestMessage.createdAt).finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [messages, hasMore, fetchChatHistory]);

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
        model: selectedModel.id,
        provider: selectedModel.provider,
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[80vh] flex flex-col z-50">
      <CardHeader className="bg-primary text-primary-foreground p-4">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg">Ask AI</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-primary-foreground/80 cursor-help">
                  Using: {selectedModel.name} ({selectedModel.provider})
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>Current AI model for conversations</p>
                <p className="text-xs mt-1">Change in Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-primary-foreground hover:bg-primary/90"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-4 w-4"
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
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close AI chat panel</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-[400px] p-4">
          {hasMore && (
            <div className="flex justify-center my-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreMessages}
                    disabled={isLoadingMore}
                    className="text-xs"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load more messages'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Load previous conversation history</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((message) => {
              const timestamp = message.timestamp || new Date(message.createdAt);
              const isUser = message.role === 'user';
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}> 
                      {isUser ? 'U' : 'AI'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    isUser 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {isUser ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1"
              disabled={isLoading}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="shrink-0"
                >
                  {isLoading ? '...' : 'Send'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isLoading ? 'AI is thinking...' : input.trim() ? 'Send message' : 'Type a message first'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}