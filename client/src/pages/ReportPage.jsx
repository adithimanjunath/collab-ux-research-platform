import React, { useState, useRef, useEffect } from 'react';
import InputPanel from '../components/InputPanel';
import InsightCards from '../components/InsightCards';
import UserDelightSection from '../components/UserDelightSection';
import { handleExportPDF } from '../services/pdfExport';

 const quotes = [
    "“Pay attention to what users do, not what they say.” – Jakob Nielsen",
    "“Usability is not only about ease of use but also about bringing something meaningful.” – A. Marcus",
    "“If the user can’t use it, it doesn’t work.” – Susan Dray",
    "“Design is not just what it looks like and feels like. Design is how it works.” – Steve Jobs",
    "“A user interface is like a joke. If you have to explain it, it’s not that good.”"
  ];

function ReportPage() {
  const [mode, setMode] = useState('paste');
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [randomQuote, setRandomQuote] = useState('');
  const reportRef = useRef();

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRandomQuote(quotes[quoteIndex]);
  }, [quoteIndex]);

  const handleUpload = async () => {
    if ((mode === 'upload' && !file) || (mode === 'paste' && !textInput.trim())) return;
    setIsLoading(true);
    setHasAnalyzed(true);

    await new Promise((res) => setTimeout(res, 1000));

    const mockData = {
      top_insight: 'Users struggle with onboarding due to inconsistent labels.',
      pie_data: [
        { name: 'Usability', value: 12 },
        { name: 'Performance', value: 6 },
        { name: 'Accessibility', value: 4 },
        { name: 'Content', value: 8 }
      ],
      insights: {
        Usability: ['Dropdowns are unclear.', 'Labels not consistent.'],
        Performance: ['Login is slow.', 'Scroll interaction lags.'],
        Accessibility: ['Low contrast text.', 'No keyboard support.'],
        Content: ['Too much jargon.', 'Lacks tooltip help.']
      }
    };

    setReportData(mockData);
    setIsLoading(false);
  };

  const handleReset = () => {
    setFile(null);
    setTextInput('');
    setReportData(null);
    setHasAnalyzed(false);
    setIsLoading(false);
  };

  return (
    
    <div className="w-full min-h-screen bg-gray-50">
      <div
        className={`flex transition-all duration-500 ease-in-out ${
          hasAnalyzed
            ? 'flex-col lg:flex-row gap-6 px-6 py-6 items-start'
            : 'items-center justify-center h-screen'
        }`}
      >
        {/* Sidebar Wrapper */}
        <div
          className={`transition-all duration-500 ${
            hasAnalyzed ? 'w-full max-w-xs' : ''
          }`}
        >
          <div className="w-[300px] min-h-[620px] bg-white p-6 rounded-xl shadow mx-auto">
            <InputPanel
              mode={mode}
              setMode={setMode}
              file={file}
              setFile={setFile}
              textInput={textInput}
              setTextInput={setTextInput}
              isLoading={isLoading}
              handleUpload={handleUpload}
              hasAnalyzed={hasAnalyzed}
              handleReset={handleReset}
              handleExportPDF={() => handleExportPDF(reportRef)}
              randomQuote={randomQuote}
            />
          </div>
        </div>

        {/* Report Content */}
        {hasAnalyzed && reportData && (
          <div ref={reportRef} className="w-full space-y-4 px-3 py-2 pb-3">
             <div className="animate-fade-in-up">
              <InsightCards reportData={reportData} />
             </div>

            <div className="animate-fade-in-up">
            <UserDelightSection />
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportPage;
