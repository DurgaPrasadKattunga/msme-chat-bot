import { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UploadStatus {
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const PDFUpload = () => {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processText = async (text: string, documentId: string, pageNumber: number) => {
    const chunkSize = 500;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              documentId,
              text: chunks[i],
              pageNumber,
              chunkIndex: i,
            }),
          }
        );
      } catch (error) {
        console.error('Error processing chunk:', error);
      }
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdfjsLib = (window as any).pdfjsLib;

          if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded');
          }

          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }

          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const pdfFiles = Array.from(files).filter(
      (file) => file.type === 'application/pdf'
    );

    for (const file of pdfFiles) {
      const uploadStatus: UploadStatus = {
        filename: file.name,
        status: 'uploading',
        progress: 0,
      };

      setUploads((prev) => [...prev, uploadStatus]);

      try {
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            filename: file.name,
            file_path: file.name,
            file_size: file.size,
            status: 'processing',
          })
          .select()
          .single();

        if (docError) throw docError;

        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? { ...u, status: 'processing', progress: 50 }
              : u
          )
        );

        const text = await extractTextFromPDF(file);
        await processText(text, docData.id, 1);

        await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', docData.id);

        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? { ...u, status: 'completed', progress: 100 }
              : u
          )
        );
      } catch (error: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name
              ? { ...u, status: 'error', error: error.message }
              : u
          )
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">PDF Upload</h1>
          <p className="text-slate-600 mb-8">
            Upload PDF documents to train the MSME chatbot knowledge base
          </p>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Drag and drop PDF files here
            </p>
            <p className="text-sm text-slate-500 mb-4">or</p>
            <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {uploads.length > 0 && (
            <div className="mt-8 space-y-3">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Upload Progress
              </h2>
              {uploads.map((upload, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <span className="font-medium text-slate-800">
                        {upload.filename}
                      </span>
                    </div>
                    {upload.status === 'uploading' && (
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {upload.status === 'processing' && (
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {upload.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {upload.status === 'error' && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        upload.status === 'error'
                          ? 'bg-red-600'
                          : upload.status === 'completed'
                          ? 'bg-green-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    ></div>
                  </div>
                  {upload.error && (
                    <p className="text-sm text-red-600 mt-2">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Important Notes:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Only PDF files are supported</li>
            <li>• Files will be processed and added to the knowledge base</li>
            <li>• Processing may take a few moments for large files</li>
            <li>• Ensure PDFs contain searchable text (not scanned images)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;
