import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPdfToCloudinary, streamDocumentExtraction } from '@/utils/actions/upload.actions';
import { loadThreadDetailsAction } from '@/utils/actions/chat.actions';
import { useAuth } from '@/utils/hooks/useAuth';

export default function DocumentUploadInterface({ threadId, setThreads, setIsThreadLoading }) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [file, setFile] = useState(null);
  const [instructionsUrl, setInstructionsUrl] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  
  // SSE State
  const [extractionLogs, setExtractionLogs] = useState([]);
  const abortStreamRef = useRef(null);

  // Fetch existing thread if navigating to a specific threadId
  useEffect(() => {
    let isMounted = true;
    
    const fetchThread = async () => {
      if (threadId) {
        setIsThreadLoading(true);
        const { thread, error } = await loadThreadDetailsAction(threadId);
        
        if (isMounted) {
          if (!error && thread) {
            setSubmissions([{
              id: thread.threadId,
              fileName: thread.title || 'Previous Document',
              url: thread.instructionsUrl,
              publicId: thread.publicId,
              status: 'success'
            }]);
            setExtractionLogs([]);
          } else {
            setError(error || "Could not load thread details.");
            setSubmissions([]);
          }
          setIsThreadLoading(false);
        }
      } else {
        // Reset state for "New Format Request" route
        setSubmissions([]);
        setExtractionLogs([]);
        setFile(null);
        setInstructionsUrl('');
        setError(null);
      }
    };
    
    fetchThread();
    
    return () => { isMounted = false; };
  }, [threadId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) abortStreamRef.current();
    };
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please provide a manuscript file to upload.');
      return;
    }

    if (!instructionsUrl) {
      setError('Please provide a guidelines URL.');
      return;
    }

    try {
      new URL(instructionsUrl);
    } catch (err) {
      setError('Please enter a valid Instructions URL (e.g., https://example.com).');
      return;
    }

    setIsUploading(true);
    setError(null);

    // Optimistic UI state
    const currentSubmission = {
      id: Date.now(),
      fileName: file.name,
      url: instructionsUrl,
      status: 'uploading'
    };
    
    setSubmissions(prev => [currentSubmission, ...prev]);

    try {
      // Generate or use existing Thread ID
      const activeThreadId = threadId || `${auth?.user?.id || 'anon'}_${Date.now()}`;
      const isNewThread = !threadId;

      if (isNewThread && setThreads) {
        setThreads(prev => [{
          threadId: activeThreadId,
          threadName: file.name,
          updatedAt: new Date().toISOString()
        }, ...(prev || [])]);
        
        // Immediately navigate to preserve the URL schema
        navigate(`/workspace/${activeThreadId}`, { replace: true });
      }

      // 1. Upload to Cloudinary First
      const cloudinaryResult = await uploadPdfToCloudinary(file);

      const payload = {
        threadId: activeThreadId,
        publicId: cloudinaryResult.public_id,
        fileName: file.name,
        instructionsUrl: instructionsUrl
      };

      // 2. Start SSE Stream Process
      setSubmissions(prev => prev.map(sub => 
        sub.id === currentSubmission.id 
          ? { ...sub, status: 'success', publicId: payload.publicId }
          : sub
      ));

      setExtractionLogs([]); // Clear any previous logs
      
      const { stream, abort } = streamDocumentExtraction(payload);
      abortStreamRef.current = abort;

      for await (const event of stream) {
        if (event.type === 'error') {
          setError(event.val);
          break; // Stop listening on error
        } else if (event.type === 'loading' || event.type === 'processing' || event.type === 'connection' || event.type === 'success') {
          // Append line cleanly to UI Logs
          setExtractionLogs(prev => [...prev, { type: event.type, text: event.val, id: Date.now() + Math.random() }]);
        }
      }

      // 3. Reset form
      setFile(null);
      setInstructionsUrl('');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process manuscript.');
      setSubmissions(prev => prev.map(sub => 
        sub.id === currentSubmission.id 
          ? { ...sub, status: 'error', error: err.message }
          : sub
      ));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-4">
      
      {/* 1. SUCCESS STATE: Hide form, show attachment */}
      {submissions.length > 0 && submissions[0].status === 'success' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* User's Message (The Document Upload Card) */}
          <div className="w-full mb-8">
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 w-full shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-[#18181b] rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-sm">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-[#fafafa] leading-snug mb-1 truncate max-w-[250px] sm:max-w-sm md:max-w-md" title={submissions[0].fileName}>
                    {submissions[0].fileName}
                  </h3>
                  <div className="flex items-center gap-2 text-[13px] min-w-0">
                    <span className="text-[#a1a1aa] shrink-0">Guidelines URL:</span> 
                    <a href={submissions[0].url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" title={submissions[0].url}>
                      {submissions[0].url}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time SSE Extraction Execution Logs — only shown during active extraction */}
          {isUploading && (
            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-transparent pr-4">
                <div className="prose prose-invert prose-sm max-w-none text-[#fafafa] leading-relaxed">
                
                  <div className="bg-[#18181b] rounded-lg p-4 border border-white/5 my-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      Extraction Pipeline Log
                    </h4>
                    
                    {extractionLogs.length === 0 ? (
                      <p className="text-xs text-[#a1a1aa] italic">Connecting to processing server...</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-[#a1a1aa] list-none pl-0 font-mono text-[12px]">
                        {extractionLogs.map((log) => (
                          <li key={log.id} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div> 
                            {log.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. UPLOAD/ERROR STATE: Show form */}
      {(!submissions.length || submissions[0].status !== 'success') && (
        <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in fade-in duration-300">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-[#fafafa] mb-2 tracking-tight">Format Your Manuscript</h2>
            <p className="text-[#a1a1aa] text-sm">Upload your draft and target journal to automatically apply formatting rules.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Drag & Drop Area */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}
                ${file ? 'border-green-500/50 bg-green-500/5' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
                {file ? (
                  <>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[#fafafa] font-medium">{file.name}</p>
                      <p className="text-xs text-[#a1a1aa] mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragActive ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                      <UploadCloud className={`w-6 h-6 ${isDragActive ? 'text-blue-400' : 'text-[#a1a1aa]'}`} />
                    </div>
                    <div>
                      <p className="text-[#fafafa] font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-[#a1a1aa]">DOCX, PDF, or Plain Text (Max 50MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Instructions URL */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="url" className="text-sm font-medium text-[#fafafa]">Guidelines URL <span className="text-red-400">*</span></label>
              <input 
                type="url" 
                id="url"
                value={instructionsUrl}
                onChange={(e) => setInstructionsUrl(e.target.value)}
                placeholder="https://example.com/guidelines"
                className="w-full bg-[#18181b] border border-white/10 text-[#fafafa] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-[#52525b]"
                disabled={isUploading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={!file || isUploading}
              className="w-full bg-[#fafafa] text-[#18181b] font-semibold py-3 px-4 rounded-xl hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Upload...
                </>
              ) : (
                'Format Document'
              )}
            </button>

          </form>
        </div>
      )}
    </div>
  );
}
