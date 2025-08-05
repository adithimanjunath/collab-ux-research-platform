import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA66CC'];

function InsightCards({ reportData }) {
  return (
    <>
      {/* Top Insight */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800">🔍 Top Insight</h2>
        <p className="text-gray-700 mt-2">{reportData.top_insight}</p>
      </div>

      {/* Summary Tags + Insights by Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Summary Tags Chart */}
        <div className="bg-gray-50 p-4 rounded-lg shadow h-full flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Summary Tags</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={reportData.pie_data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {reportData.pie_data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Insights by Theme */}
        <div className="bg-gray-50 p-4 rounded-lg shadow h-full flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🧠 Insights by Theme</h2>
          {Object.entries(reportData.insights).map(([tag, items]) => (
            <div key={tag} className="mb-4">
              <h4 className="font-bold text-blue-700">{tag}</h4>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                {items.map((text, idx) => (
                  <li key={idx}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default InsightCards;
