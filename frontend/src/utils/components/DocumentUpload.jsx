import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';

export default function DocumentUpload({ onSubmit, isUploading = false }) {
  const [file, setFile] = useState(null);
  const [guidelinesUrl, setGuidelinesUrl] = useState('');
  const [error, setError] = useState(null);

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
    maxFiles: 1,
    disabled: isUploading
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please provide a manuscript file to upload.');
      return;
    }

    if (!guidelinesUrl) {
      setError('Please provide a guidelines URL.');
      return;
    }

    try {
      new URL(guidelinesUrl);
    } catch (err) {
      setError('Please enter a valid Instructions URL (e.g., https://example.com).');
      return;
    }

    setError(null);
    onSubmit({ file, guidelinesUrl });

    // Reset form after submission
    setFile(null);
    setGuidelinesUrl('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-4">
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
                    <p className="text-xs text-[#a1a1aa]">DOCX, PDF, or Plain Text (.txt) (Max 50MB)</p>
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
              value={guidelinesUrl}
              onChange={(e) => setGuidelinesUrl(e.target.value)}
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
    </div>
  );
}
