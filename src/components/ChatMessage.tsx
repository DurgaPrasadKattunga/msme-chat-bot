import { ChatMessage as ChatMessageType } from '../types';
import { FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl shadow-sm border p-4 max-w-3xl ${
            isUser
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-700"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Page {source.pageNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-1 px-2">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
