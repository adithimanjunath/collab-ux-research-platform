// src/components/ChartLegend.jsx
import { Box, Typography } from "@mui/material";

export default function ChartLegend({ data = [], colors = [] }) {
  if (!data || data.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 1,
        px:1,
        maxWidth: "100%",
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 1.25, 
        justifyContent: 'center', 
      }}
    >
      {data.map((entry, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifySelf:"center",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: colors[i % colors.length],
              flexShrink: 0, 
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "normal" }}>
            {entry.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}