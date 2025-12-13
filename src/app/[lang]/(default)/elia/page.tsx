'use client';

import { useState, useRef, useEffect } from 'react';
import { eliaClient } from '@/lib/elia/client';
import type { ChatMessage, ProductResult, StreamEvent } from '@/lib/elia/types';
import { ThinkingSteps } from '@/components/elia/thinking-steps';
import { ChatMessageComponent } from '@/components/elia/chat-message';
import { ProductGrid } from '@/components/elia/product-grid';
import { EliaInput } from '@/components/elia/input';
import { AiOutlineRobot } from 'react-icons/ai';

interface ThinkingStep {
  step: string;
  message: string;
  completed: boolean;
}

export default function EliaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentProducts, setCurrentProducts] = useState<ProductResult[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingSteps]);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Reset state
    setThinkingSteps([]);
    setCurrentProducts([]);
    setIsSearching(true);

    let tempProducts: ProductResult[] = [];

    try {
      // Stream from FastAPI
      for await (const event of eliaClient.streamSearch(text)) {
        handleStreamEvent(event, tempProducts);
      }
    } catch (error) {
      console.error('Stream error:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSearching(false);
      setThinkingSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
    }
  };

  const handleStreamEvent = (
    event: StreamEvent,
    tempProducts: ProductResult[],
  ) => {
    switch (event.type) {
      case 'thinking':
        setThinkingSteps((prev) => {
          // Mark previous as completed
          const updated = prev.map((s) => ({ ...s, completed: true }));
          // Add new step
          return [
            ...updated,
            {
              step: event.step!,
              message: event.message!,
              completed: false,
            },
          ];
        });
        break;

      case 'intent':
        console.log('Intent:', event.data);
        break;

      case 'products':
        tempProducts.push(...event.data.products);
        setCurrentProducts(event.data.products);
        break;

      case 'message':
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: event.data.text,
          products: tempProducts,
          suggestions: event.data.suggestions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        break;

      case 'done':
        setThinkingSteps((prev) =>
          prev.map((s) => ({ ...s, completed: true })),
        );
        break;

      case 'error':
        console.error('Stream error:', event.data);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Chat Sidebar */}
      <div className="w-[400px] bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AiOutlineRobot className="w-6 h-6" />
            ELIA Assistant
          </h1>
          <p className="text-sm text-blue-100 mt-1">
            AI-powered product search
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <AiOutlineRobot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Ask me anything about products!</p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() =>
                    handleSendMessage('lavandino bagno moderno bianco')
                  }
                  className="text-sm text-blue-600 hover:underline block mx-auto"
                >
                  "lavandino bagno moderno bianco"
                </button>
                <button
                  onClick={() => handleSendMessage('rubinetto cucina cromato')}
                  className="text-sm text-blue-600 hover:underline block mx-auto"
                >
                  "rubinetto cucina cromato"
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              {...message}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}

          {/* Thinking indicator */}
          {isSearching && thinkingSteps.length > 0 && (
            <ThinkingSteps steps={thinkingSteps} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <EliaInput onSend={handleSendMessage} disabled={isSearching} />
        </div>
      </div>

      {/* Products Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentProducts.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Found {currentProducts.length} products
              </h2>
              <p className="text-sm text-gray-600 mt-1">Sorted by relevance</p>
            </div>
            <ProductGrid products={currentProducts} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg">Search for products using ELIA</p>
              <p className="text-sm mt-2">Results will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
