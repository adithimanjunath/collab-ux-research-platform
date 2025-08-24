import React,{useMemo, useState} from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Lightbulb} from "lucide-react";
import ChartLegend from "./ChartLegend";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Divider,
  Box,
  CircularProgress,Stack
} from "@mui/material";

const COLORS = ['#93C5FD','#86EFAC','#FDE68A','#FBCFE8','#A7F3D0','#FCA5A5','#C7D2FE'];

export function SummaryTagsCard({ data = [], isLoading = false, expandAll = false }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        boxShadow: 2,
      }}
    >
      <CardHeader
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>Summary Tags</Typography>}
        action={
          <Typography variant="caption" color="text.secondary">
            {isLoading ? "loading…" : hasData ? `${data.length}` : "—"}
          </Typography>
        }
      />
      <Divider />
      <CardContent
        sx={{
          // ensure the content actually has room
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          pb: 2,
        }}
      >
        {isLoading && !expandAll ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={220}>
            <Typography color="primary">Analyzing…</Typography>
          </Box>
        ) : hasData ? (
          <>
            {/* Give the chart a solid, explicit height */}
            <Box sx={{ width: "100%", height: 260, px: 1 }}>
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
                    isAnimationActive={false} // avoids export timing glitches
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Legend wraps/flows inside card bounds */}
            < ChartLegend data={data} colors={COLORS} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Not enough data was provided to display tag distribution.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function InsightsByThemeCard({ insights = {}, isLoading = false, expandAll = false}) {
  const [expandedTag, setExpandedTag] = useState({}); 
  const entries = useMemo(
    () => Object.entries(insights || {}).map(([tag, items]) => ({
      tag,
      items: Array.isArray(items) ? items : [],
    })),
    [insights]
  );
  const hasData = entries.length > 0;
  // Toggle function for each theme
  const toggleExpand = (tag) => {
    setExpandedTag(prev => ({
        ...prev,
        [tag]: !prev[tag]
    }));
  }
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
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>Insights by Theme</Typography>}
        action={
          <Typography variant="caption" color="text.secondary">
            {isLoading ? "loading…" : hasData ? `${entries.length} themes` : "—"}
          </Typography>
        }
      />
      <Divider />
      <CardContent sx={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
             <Typography color="primary">Analyzing…</Typography>
          </Box>
        ) : hasData ? (
          <Stack spacing={2.5}>
            {entries.map(({ tag, items }) => {
              const MAX = 3;
              const extra = Math.max(0, items.length - MAX);
              const isExpanded = expandAll || !!expandedTag[tag];
              const itemsToShow = isExpanded ? items : items.slice(0, MAX);

              return (
                // Each theme is now a Box inside the scrollable CardContent
                <Box key={tag}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" color="primary">{tag}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1, py: 0.2,
                        borderRadius: "8px",
                        bgcolor: "primary.light",
                        color: "primary.dark",
                      }}
                    >
                      {items.length}
                    </Typography>
                  </Box>
                  <ul style={{ paddingLeft: 16, margin: '8px 0' }}>
                    {itemsToShow.map((item, i) => (
                      <li key={i}><Typography variant="body2" color="text.secondary">{item}</Typography></li>
                    ))}
                  </ul>
                  {!expandAll && extra > 0 && (
                    <Typography 
                      variant="caption" 
                      color="primary" 
                      onClick={() => toggleExpand(tag)}
                      sx={{ cursor: "pointer", fontWeight: 500, pl: 0.5, mt: 0.5, display: 'inline-block' }}
                    >
                      {isExpanded ? 'Show less' : `+${extra} more`}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography variant="body2" color="text.secondary">
              No insights found. Analyze feedback to discover themes.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightCards({
  reportData = {},
  isLoading = false,
  isEmpty = false,
  onlyTop = false,
}) {
  const topInsight = reportData?.top_insight;
      return (
    <section style={{ width: "100%" }}>
      {/* Research Report Overview */}
      <Box mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Research Report Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Summary of extracted insights, themes, and tag distribution.
        </Typography>
      </Box>

      {/* Top Insight */}
      <Box
        sx={{
          borderRadius: 2,
          p: 2,
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "grey.200",
          mb: 3,
        }}
      >
        <Box display="flex" gap={2} alignItems="flex-start">
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "amber.50",
              color: "amber.700",
              border: "1px solid #fef3c7",
            }}
          >
            <Lightbulb size={20} />
          </Box>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              Top Insight
            </Typography>
            {isLoading ? (
              <Box mt={1}>
                <Box
                  height={18}
                  width="80%"
                  bgcolor="grey.200"
                  mb={1}
                  borderRadius={1}
                />
                <Box height={18} width="60%" bgcolor="grey.200" borderRadius={1} />
              </Box>
            ) : topInsight && !isEmpty ? (
              <Typography variant="body1" sx={{ mt: 1.5 }}>
                {topInsight}
              </Typography>
            ) : (
               <Typography variant="body2" color="text.secondary">
            Enter the data to analyse and view the results.
          </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Stop if onlyTop is true */}
      {onlyTop ? null : isLoading ? (
        <Box p={3} textAlign="center">
          <CircularProgress />
          <Typography variant="caption" display="block" mt={1}>
            Analyzing your notes…
          </Typography>
        </Box>
      ) : null}
    </section>
  );
}