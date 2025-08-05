import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function UserDelightSection() {
  const delightData = [
    { name: 'UI Design', value: 40 },
    { name: 'Performance', value: 25 },
    { name: 'Features', value: 20 },
    { name: 'Animations', value: 15 }
  ];

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">🎉 User Delight Moments</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Quotes */}
        <div className="bg-white p-4 rounded-md shadow-sm h-full flex flex-col">
          <h3 className="text-md font-semibold text-gray-700 mb-2">💬 Quotes That Sparked Joy</h3>
          <ul className="list-disc text-gray-700 space-y-2 ml-4">
            <li>“Love the dark mode option.”</li>
            <li>“The drag-and-drop upload felt magical.”</li>
            <li>“Animations made the experience smooth.”</li>
            <li>“Minimalistic design was calming.”</li>
          </ul>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-4 rounded-md shadow-sm h-full flex flex-col">
          <h3 className="text-md font-semibold text-gray-700 mb-2">📊 Delight Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                dataKey="value"
                nameKey="name"
                data={delightData}
                cx="50%"
                cy="50%"
                outerRadius={75}
                label
              >
                {delightData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default UserDelightSection;
