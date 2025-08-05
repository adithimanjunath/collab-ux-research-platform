import { Loader2, Download } from 'lucide-react';
import TipsBox from './TipsBox';
import { useNavigate } from 'react-router-dom';

function InputPanel({
  mode, setMode, file, setFile, textInput, setTextInput,
  isLoading, handleUpload, hasAnalyzed, handleReset, handleExportPDF, randomQuote
}) {
  const navigate = useNavigate();

  return (
    <div className={`bg-white p-6 rounded-xl shadow flex flex-col justify-start transition-all duration-500 ${hasAnalyzed ? 'w-full max-w-md xl:max-w-sm' : 'w-full max-w-md'}`}>
      
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">UX Report Generator</h1>
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-2 rounded-md text-sm font-semibold ${mode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Upload File
        </button>
        <button
          onClick={() => setMode('paste')}
          className={`px-4 py-2 rounded-md text-sm font-semibold ${mode === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
        >
          Paste Text
        </button>
      </div>

      {/* Upload or Paste */}
      {mode === 'upload' ? (
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4 text-sm w-full"
        />
      ) : (
        <textarea
          rows={5}
          className="w-full border border-gray-300 rounded-md p-3 text-sm text-gray-700 mb-4"
          placeholder="Paste interview text here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
      )}
      <button
        onClick={handleUpload}
        disabled={isLoading || (mode === 'upload' && !file) || (mode === 'paste' && !textInput.trim())}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex justify-center items-center gap-2">
            <Loader2 className="animate-spin w-5 h-5" />
            Processing...
          </span>
        ) : (
          'Analyze'
        )}
      </button>

      {/* After Analyze Buttons & Tips */}
      {hasAnalyzed && !isLoading && (
        <>
          <button
            onClick={handleReset}
            className="w-full mt-4 bg-gray-100 text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg border border-gray-300 transition"
          >
            🔄 Start New Analysis
          </button>

          <div className="mt-4">
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 text-sm font-medium py-2 px-4 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export Report (.pdf)
            </button>
          </div>
         
          {/* Tips Box */}
          <div className="mt-6 transition-all duration-500 ease-in-out">
            <TipsBox />
          </div>

          {/* Random Quote */}
          <div className="mt-4 px-3 py-3 bg-gray-50 border-l-4 border-blue-500 rounded-md text-sm italic text-gray-700">
            {randomQuote}
          </div>
          {/* Navigation Button */}<button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-blue-600 hover:underline self-start align-self-start"
          >
          Back to Feature Selection
          </button>
        </>
        
      )}
       

    </div>
  );
}

export default InputPanel;
