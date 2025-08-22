import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {  Sparkles } from "lucide-react";
import Button from "@mui/material/Button";

const COLORS = ["#93C5FD", "#86EFAC", "#FDE68A", "#FBCFE8", "#A7F3D0", "#C7D2FE"];

export default function ResultsPreview({ reportData = {}, onOpen,onLeave }) {
  const pie = Array.isArray(reportData?.pie_data) ? reportData.pie_data : [];
  const insights = reportData?.insights || {};
  const themes = Object.entries(insights); // [ [theme, items], ... ]
  const positives = reportData?.positive_highlights || [];

  // If we truly have nothing yet, show nothing (keeps page clean)
  if (!pie.length && !themes.length && !positives.length) return null;

  return (
    <div className="grid grid-cols-12 gap-5">
      
      {/* Mini pie */}
      <div className="col-span-12 md:col-span-4 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900">Tag Preview</h4>
        </div>
        <div className="h-[140px]">
          {pie.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                  {pie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-500">No tags yet</p>
          )}
        </div>
      </div>

      {/* Top themes */}
      <div className="col-span-12 md:col-span-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900">
            Top Themes <span className="text-slate-400 text-xs">({themes.length})</span>
          </h4>
        </div>
        <ul className="text-sm space-y-1.5">
          {themes.slice(0, 5).map(([name, items]) => (
            <li key={name} className="flex items-center justify-between">
              <span className="truncate">{name}</span>
              <span className="text-slate-500 text-xs">{items?.length ?? 0}</span>
            </li>
          ))}
          {!themes.length && <li className="text-xs text-slate-500">No themes yet</li>}
        </ul>
      </div>

      {/* Delight summary + CTA */}
      <div className="col-span-12 md:col-span-3 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-semibold text-slate-900">Delight</h4>
        </div>
        <p className="text-sm text-slate-700">
          {positives.length ? `${positives.length} positive highlights` : "No highlights yet"}
        </p>
          <Button variant="outlined" color="primary" size="small"  onClick={onOpen}>
         View Results</Button>
          {onLeave && (
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={onLeave}   // <-- IMPORTANT: onClick, not onLeave
          >
            Leave
          </Button>
        )}
      </div>
    </div>
  );
}
