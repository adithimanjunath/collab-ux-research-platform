// ReportPage.jsx
import { useState, useRef, useEffect } from 'react';
import InputPanel from '../components/InputPanel';
import InsightCards from '../components/InsightCards';
import ResultsModal from '../components/ResultsModal';
import ResultsPreview from '../components/ResultsPreview';
import Button from "@mui/material/Button";
import Header from '../components/Header';
import { useTheme } from '@mui/material';
import { getAuthHeader } from '../utils/authHeader';

const quotes = [
  '“Pay attention to what users do, not what they say.” – Jakob Nielsen',
  '“Usability is not only about ease of use but also about bringing something meaningful.” – A. Marcus',
  '“If the user can’t use it, it doesn’t work.” – Susan Dray',
  '“Design is not just what it looks like and feels like. Design is how it works.” – Steve Jobs',
  '“A user interface is like a joke. If you have to explain it, it’s not that good.”',
];

function ReportPage() {
  const [mode, setMode] = useState('paste');
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [randomQuote, setRandomQuote] = useState('');
  const openResults = ()=> setShowResults(true)
  const handleLeave = () => window.history.back();
  const reportRef = useRef();
  const theme = useTheme();

  useEffect(() => {
    const id = setInterval(() => setQuoteIndex((p) => (p + 1) % quotes.length), 8000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setRandomQuote(quotes[quoteIndex]), [quoteIndex]);

  const handleUpload = async () => {
    if ((mode === 'upload' && !file) || (mode === 'paste' && !textInput.trim())) return;
    setIsLoading(true);
    setHasAnalyzed(true);
    try {
      const form = new FormData();
      if (mode === 'upload') form.append('file', file);
      else form.append('text', textInput);

      const API_BASE = process.env.REACT_APP_API_URL || (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5050'
          : '');

      // Include Authorization header (endpoint is protected)
      let headers = {};
      try {
        const auth = await getAuthHeader();
        headers = { ...auth, Accept: 'application/json' };
      } catch (e) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`${API_BASE}/api/ux/analyze`, { method: 'POST', headers, body: form });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setReportData({
        top_insight: data.top_insight,
        pie_data: data.pie_data,
        insights: data.insights,
        positive_highlights: data.positive_highlights,
        delight_distribution: data.delight_distribution ?? data.delightDistribution ?? [],
        delight_by_theme: data.delight_by_theme,  
      });
      setHasAnalyzed(true);
      setShowResults(true);
    } catch (err) {
      console.error(err);
      console.error('Analyze request failed:', err);
      const msg = typeof err?.message === 'string' ? err.message : String(err);
      alert(`Analysis failed. ${msg}`);
      setHasAnalyzed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTextInput('');
    setReportData(null);
    setHasAnalyzed(false);
    setIsLoading(false);
  };

  return (
  <div className="min-h-screen w-full" style={{ backgroundColor: theme.palette.background.default }}>
  <Header mode="report" title="UX Toolkit" onLeave={handleLeave}>
  {/* Help = low emphasis → text button */}
  <Button 
    variant="text"
    color="primary"
    size="small"
    onClick={() => alert("Please make sure that the data in file is in the format of Q: and A:. Documnets should be in PDF Format only ")}
  >
    Help
  </Button>
</Header>


<main className="px-6">
  {/* wrapper that fills the viewport minus header and centers content */}
  <div className="mx-auto max-w-5xl min-h-[calc(100vh-80px)] py-8
                  flex justify-center items-start md:items-center">
    <div className="w-full">
      {!hasAnalyzed ? (
        // centered input card
        <div className="bg-white/90 border border-slate-200 rounded-2xl shadow-lg
                        p-6 sm:p-8 min-h-[60vh]">
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
            randomQuote={randomQuote}
            compact={false}
            showQuote
          />
        </div>
      ) : (
        // centered results card
        <section>
          <div
            ref={reportRef}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8
                       space-y-6 min-h-[60vh]"
          >
            <InsightCards
              reportData={reportData}
              isLoading={isLoading}
              isEmpty={!file && !textInput.trim() && !hasAnalyzed}
              onlyTop
            />
            {reportData ? (
              <ResultsPreview reportData={reportData} onOpen={openResults}  />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
                Add text or upload a PDF above and click <strong>Analyze</strong> to see insights here.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  </div>
</main>


      <ResultsModal
        open={showResults}
        onClose={() => setShowResults(false)}
        reportData={reportData || {}}
        isLoading={isLoading}
        onBackToInput= { ()=>{
          setShowResults(false);
          setHasAnalyzed(false);
        }}
        onStartOver={()=>{
          setShowResults(true);
          handleReset();
        }}
      />
    </div>
  );
}

export default ReportPage;
