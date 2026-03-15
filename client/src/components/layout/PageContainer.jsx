import React from "react";
import { Box, Container } from "@mui/material";

function PageContainer({ children }) {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">{children}</Container>
    </Box>
  );
}

export default PageContainer;
