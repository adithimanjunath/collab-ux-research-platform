import React,{useState} from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ChartLegend from "./ChartLegend";
import { Card, CardContent, CardHeader, Typography, Divider, Box,Stack } from "@mui/material";

const PASTELS = ["#BAE6FD","#A7F3D0","#FDE68A","#FBCFE8","#C7D2FE","#FCA5A5"];

export function DelightNotes({ highlights = [], expandAll = false  }) {
  const [expandedTag, setExpandedTag] = useState({});
 

  // Normalize input to entries like [{ tag, items }]
  const entries = Array.isArray(highlights)
    ? (highlights.length > 0
        ? [{ tag: "Notes", items: highlights }]
        : [])
    : Object.entries(highlights || {}).map(([tag, items]) => ({
        tag,
        items: Array.isArray(items) ? items : [],
      }));

  const has = entries.length > 0;

  const toggleExpand = (tag) => {
    setExpandedTag((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  const MAX = 4; // max items per theme before “more”

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        boxShadow: 2,
        height: "100%",
        width: "100%",
      }}
    >
      <CardHeader
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>User Delight — Notes</Typography>}
      />
      <Divider />
      <CardContent sx={{ flex: 1, overflow: "auto" }}>
        {has ? (
          <Stack spacing={2.5}>
            {entries.map(({ tag, items }) => {
              const extra = Math.max(0, items.length - MAX);
              const isExpanded = expandAll || !!expandedTag[tag];
              const itemsToShow = isExpanded ? items : items.slice(0, MAX);

              return (
                <Box key={tag}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" color="primary">{tag}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.2,
                        borderRadius: "8px",
                        bgcolor: "primary.light",
                        color: "primary.dark",
                      }}
                    >
                      {items.length}
                    </Typography>
                  </Box>

                  <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
                    {itemsToShow.map((q, i) => (
                      <li key={i}>
                        <Typography variant="body2" color="text.secondary">{q}</Typography>
                      </li>
                    ))}
                  </ul>

                  {!expandAll && extra > 0 && (
                    <Typography
                      variant="caption"
                      color="primary"
                      onClick={() => toggleExpand(tag)}
                      sx={{ cursor: "pointer", fontWeight: 500, pl: 0.5, mt: 0.5, display: "inline-block" }}
                    >
                      {isExpanded ? "Show less" : `+${extra} more`}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography variant="body2" color="text.secondary" align="center" sx={{ px: 2 }}>
              No specific user delight moments were found in the data.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function DelightChart({ data = [], isLoading = false, expandAll = false }) {
  // 1) We have an array?  2) What's the total?

  const hasArray = Array.isArray(data) && data.length > 0;
  const total = hasArray ? data.reduce((sum, d) => sum + (d.value || 0), 0) : 0;
  const isEmpty =total === 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        boxShadow: 2,
      }}
    >
      <CardHeader
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>Delight Distribution</Typography>}
        action={
          <Typography variant="caption" color="text.secondary">
            {isLoading ? "loading…" : hasArray ? `${data.length}` : "—"}
          </Typography>
        }
      />
      <Divider />
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* EMPTY state: plain HTML, no chart/legend */}
        {!hasArray || isEmpty ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              textAlign: "center",
              px: 2,
            }}
          >
            <Typography variant="body2">
              No specific user delight moments were found in the data.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="70%"
                    isAnimationActive={false}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PASTELS[i % PASTELS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            {/* Show legend ONLY when we have data */}
            < ChartLegend data={data} colors={PASTELS} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
export default function UserDelightSection(){ return null; }
