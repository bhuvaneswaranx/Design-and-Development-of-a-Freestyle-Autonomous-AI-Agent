
import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { startChat } from './services/geminiService';
import type { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import TypingIndicator from './components/TypingIndicator';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    try {
      const chatInstance = startChat();
      setChat(chatInstance);
      setMessages([
        {
          id: 'init',
          role: 'model',
          text: 'Hello! How can I assist you today?',
        },
      ]);
    } catch (e) {
      console.error(e);
      setError('Failed to initialize the chat service. Please check your API key.');
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (userMessage: string) => {
    if (!chat) return;

    setIsLoading(true);
    setError(null);

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessage,
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    const modelResponseId = `model-${Date.now()}`;
    // Add a placeholder for the model's response
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: modelResponseId, role: 'model', text: '' },
    ]);

    try {
      const stream = await chat.sendMessageStream({ message: userMessage });

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === modelResponseId ? { ...msg, text: fullResponse } : msg
          )
        );
      }
    } catch (e: any) {
      console.error(e);
      setError('An error occurred while getting a response. Please try again.');
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === modelResponseId ? { ...msg, text: 'Sorry, I encountered an error.' } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-dark-bg text-light-text font-sans overflow-hidden selection:bg-brand-primary/30">
      {/* Parallax Background Layers */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        }}
      />
      <div
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-primary/20 blur-[120px] pointer-events-none z-0 mix-blend-screen"
        style={{
          transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)`,
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-secondary/20 blur-[120px] pointer-events-none z-0 mix-blend-screen"
        style={{
          transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)`,
        }}
      />
      <div
        className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-brand-accent/10 blur-[100px] pointer-events-none z-0 mix-blend-screen"
        style={{
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
        }}
      />

      {/* Noise Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      <header className="backdrop-blur-xl bg-dark-bg/60 border-b border-white/5 p-4 sticky top-0 z-20 transition-all duration-300">
        <h1 className="text-2xl md:text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent drop-shadow-sm tracking-tight">
          My Assistant
        </h1>
      </header>

      <main ref={chatContainerRef} className="flex-grow p-4 md:p-6 overflow-y-auto scroll-smooth z-10 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-32">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}
          {error && (
            <div className="text-red-300 bg-red-900/30 border border-red-500/30 p-4 rounded-xl text-center backdrop-blur-sm animate-fade-in-up shadow-lg shadow-red-900/10">
              {error}
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-20">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;
