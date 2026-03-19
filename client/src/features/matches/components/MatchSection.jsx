import React from "react";
import { Paper, Typography, Tabs, Tab, Box, Chip } from "@mui/material";
import MatchTable from "./MatchTable";

function MatchSection({
  matches,
  loading,
  onAnalyzeClick,
  activeTab = "all",
  onTabChange,
}) {
  const syncedMatches = React.useMemo(
    () => matches.filter((match) => match.h2hScraped || match.isSynced),
    [matches],
  );

  const visibleMatches = activeTab === "synced" ? syncedMatches : matches;

  const renderTabLabel = (label, count, color) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <span>{label}</span>
      <Chip
        label={count}
        color={color}
        size="small"
        sx={{
          height: 22,
          minWidth: 34,
          fontWeight: 700,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    </Box>
  );

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Match Fixtures
        {visibleMatches.length > 0 && (
          <Typography
            component="span"
            sx={{ ml: 2, color: "text.secondary", fontSize: "1rem" }}
          >
            ({visibleMatches.length} matches)
          </Typography>
        )}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => onTabChange?.(newValue)}
          aria-label="match fixture views"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={renderTabLabel("All Matches", matches.length, "info")}
            value="all"
          />
          <Tab
            label={renderTabLabel(
              "Synced Matches",
              syncedMatches.length,
              "success",
            )}
            value="synced"
          />
        </Tabs>
      </Box>

      <MatchTable
        matches={visibleMatches}
        loading={loading}
        onAnalyzeClick={onAnalyzeClick}
      />
    </Paper>
  );
}

export default MatchSection;
