import { Loader2, Upload, ClipboardEdit, Undo2, FileText, Trash2 } from "lucide-react";
import { Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {useTheme} from "@mui/material/styles"
import {useNavigate} from "react-router-dom"

export default function InputPanel({
  mode,
  setMode,
  file,
  setFile,
  textInput,
  setTextInput,
  isLoading,
  handleUpload,
  handleReset,
  compact = false,
  showQuote = false,
  randomQuote,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"} overflow-hidden`}>
      {/* Tabs */}
      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={(e, value) => value && setMode(value)}
      >
        <ToggleButton value="paste">
          <ClipboardEdit className="w-4 h-4 mr-1" />
          Paste Text
        </ToggleButton>
        <ToggleButton value="upload" component="label">
          <Upload className="w-4 h-4 mr-1" />
          Upload File
          <input
            type="file"
            hidden
            onChange={(e) => {
              setMode("upload");
              setFile(e.target.files?.[0] || null);
            }}
          />
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Inputs */}
      {mode === "paste" ? (
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">
            Paste user interview notes
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste interview text here..."
             className="w-full rounded-xl p-3 text-sm h-60 resize-vertical theme-scroll shadow-inner"
             style={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
             }

             }
          />
          <div className="mt-1 text-[11px] text-slate-500">{textInput.length} chars</div>
        </div>
      ) : (
        <div
  className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition cursor-pointer w-full min-h-[200px]"
  onClick={() => document.querySelector("#fileInput").click()}
>
  <input
    id="fileInput"
    type="file"
    className="hidden"
    onChange={(e) => {
      setFile(e.target.files?.[0] || null);
      setMode("upload");
    }}
  />
   {!file ? (
    <>
      <Upload className="w-6 h-6 mb-2 text-slate-400" />
      <p className="text-sm">Drag & drop file here, or {" "}<span style={{ color: theme.palette.primary.main, fontWeight: 500 }}>browse</span></p>
    </>
  ) : (
      <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 text-slate-800 text-sm">
        <FileText className="w-4 h-4" style={{ color: theme.palette.primary.main }} />
        <span className="truncate max-w-[200px]" title={file.name} style={{ color: theme.palette.text.primary }} >{file.name}</span>

      </div>
      <Button
                variant="text"
                color="error"
                size="small"
                onClick={() => setFile(null)}
              >
        <Trash2 className="w-4 h-4" /> Remove
      </Button>
    </div>
  )}
</div>
)}

<div className="flex gap-2">
  {/* Analyze */}
   <Button
          variant="contained"
          color="primary"
          size="medium"
          onClick={handleUpload}
          disabled={isLoading || (mode === "paste" ? !textInput.trim() : !file)}
        >
          <span className="inline-flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Analyzing..." : "Analyze"}
          </span>
        </Button>

  {/* Start New */}
        <Button
          variant="outlined"
          color="primary"
          size="medium"
          onClick={handleReset}
        >
          <Undo2 className="w-4 h-4 mr-1" /> Start New
        </Button>
        <Button
  variant="outlined"
  color="secondary"
  size="medium"
  onClick={() => navigate("/")}
>
  ⬅ Back
</Button>
      </div>

      {showQuote && randomQuote ? (
        <blockquote className="mt-4 pl-3 italic text-sm" style={{borderLeft: `4px solid ${theme.palette.primary.main}`, color: theme.palette.text.secondary,}}>
  {randomQuote}
</blockquote>

      ) : null}
    </div>
  );
}
