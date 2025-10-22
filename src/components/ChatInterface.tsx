import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Volume2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatMessage as ChatMessageType, ChatSession } from '../types';
import ChatMessage from './ChatMessage';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'english' | 'telugu'>('english');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening, transcript } = useSpeechRecognition(language);
  const { speak, speaking } = useSpeechSynthesis(language);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ language })
      .select()
      .single();

    if (!error && data) {
      setSessionId(data.id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempMessage: ChatMessageType = {
      id: Date.now().toString(),
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      language,
      is_voice: isListening,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            sessionId,
            query: userMessage,
            language,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          session_id: sessionId,
          role: 'assistant',
          content: data.response,
          language,
          is_voice: false,
          sources: data.sources || [],
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        speak(data.response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'english' ? 'telugu' : 'english');
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">MSME Assistant</h1>
            <p className="text-sm text-slate-600">
              {language === 'english' ? 'Ask me anything about MSME services' : 'MSME సేవల గురించి నన్ను అడగండి'}
            </p>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">
              {language === 'english' ? 'తెలుగు' : 'English'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  {language === 'english' ? 'Welcome! How can I help you today?' : 'స్వాగతం! నేను మీకు ఎలా సహాయం చేయగలను?'}
                </h2>
                <p className="text-slate-600">
                  {language === 'english'
                    ? 'Ask me about MSME schemes, loans, registration, and more'
                    : 'MSME పథకాలు, రుణాలు, నమోదు మరియు మరిన్ని విషయాల గురించి నన్ను అడగండి'}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                AI
              </div>
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={language === 'english' ? 'Type your message...' : 'మీ సందేశాన్ని టైప్ చేయండి...'}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                disabled={loading}
              />
              {isListening && (
                <div className="absolute right-3 top-3 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>

            <button
              onClick={toggleVoiceInput}
              className={`px-4 py-3 rounded-xl transition-colors ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              disabled={loading}
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
