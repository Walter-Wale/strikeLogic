import React from "react";
import { Paper, Box, Typography } from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";

function Header() {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
        color: "white",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <SportsSoccerIcon sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h3" component="h1">
            StrikeLogic
          </Typography>
          <Typography variant="subtitle1">
            Professional Football Data Analysis & Prediction Platform
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default Header;
