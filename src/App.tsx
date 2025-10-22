import { useState } from 'react';
import { MessageSquare, Upload } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import PDFUpload from './components/PDFUpload';

function App() {
  const [view, setView] = useState<'chat' | 'upload'>('chat');

  return (
    <div className="relative">
      {view === 'chat' ? (
        <ChatInterface />
      ) : (
        <PDFUpload />
      )}

      <div className="fixed bottom-6 right-6 flex gap-3">
        <button
          onClick={() => setView('chat')}
          className={`p-4 rounded-full shadow-lg transition-all ${
            view === 'chat'
              ? 'bg-blue-600 text-white scale-110'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
          title="Chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
        <button
          onClick={() => setView('upload')}
          className={`p-4 rounded-full shadow-lg transition-all ${
            view === 'upload'
              ? 'bg-blue-600 text-white scale-110'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
          title="Upload PDFs"
        >
          <Upload className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default App;
