import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  fetchTicketBatches,
  fetchTicketBatch,
  deleteTicketBatch,
} from "../../../services/apiService";

/** Reusable ticket card (identical layout to TicketsTab) */
function getTicketPickMeta(prediction) {
  if (
    prediction.predictedWinner &&
    (prediction.predictedWinner === prediction.homeTeam ||
      prediction.predictedWinner === prediction.awayTeam)
  ) {
    return {
      label: `Winner: ${prediction.predictedWinner}`,
      color: "success",
      variant: "filled",
    };
  }

  if (prediction.predictedWinner === "Over 1.5") {
    return { label: "Over 1.5", color: "info", variant: "outlined" };
  }

  if (prediction.predictedWinner === "Over 2.5") {
    return { label: "Over 2.5", color: "warning", variant: "outlined" };
  }

  if (prediction.predictedWinner === "BTTS") {
    return { label: "BTTS", color: "secondary", variant: "outlined" };
  }

  return {
    label: prediction.predictedWinner || "Pick",
    color: "default",
    variant: "outlined",
  };
}

function TicketCard({ matches, idx }) {
  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", borderColor: "primary.main", borderWidth: 1.5 }}
    >
      <CardHeader
        avatar={<EmojiEventsIcon sx={{ color: "warning.main" }} />}
        title={
          <Typography variant="subtitle1" fontWeight={700}>
            Ticket {idx + 1}
          </Typography>
        }
        subheader={`${matches.length} match${matches.length !== 1 ? "es" : ""}`}
        sx={{ pb: 0, "& .MuiCardHeader-content": { overflow: "hidden" } }}
      />
      <Divider />
      <CardContent sx={{ pt: 1, pb: "12px !important" }}>
        <List dense disablePadding>
          {matches.map((p, i) => (
            <ListItem key={i} disableGutters sx={{ py: 0.4 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={700}
                      sx={{ mr: 0.5, color: "primary.main", minWidth: 18 }}
                    >
                      {i + 1}.
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={p.predictedWinner === p.homeTeam ? 700 : 400}
                      sx={{
                        color:
                          p.predictedWinner === p.homeTeam
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {p.homeTeam}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: "text.disabled", mx: 0.5 }}
                    >
                      vs
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={p.predictedWinner === p.awayTeam ? 700 : 400}
                      sx={{
                        color:
                          p.predictedWinner === p.awayTeam
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {p.awayTeam}
                    </Typography>
                    <Box
                      sx={{
                        ml: "auto",
                        pl: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      <Chip
                        {...getTicketPickMeta(p)}
                        size="small"
                        sx={{ height: 22 }}
                      />
                      {p.leagueName && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.leagueName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

function formatSavedAt(savedAt) {
  if (!savedAt) return "";
  const d = new Date(savedAt);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PastTicketsTab({ lastSavedAt }) {
  const [batches, setBatches] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null); // { batch, tickets }
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    loadBatches();
  }, [lastSavedAt]);

  async function loadBatches() {
    setLoadingList(true);
    try {
      const res = await fetchTicketBatches();
      setBatches(res.data || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSelectBatch(batchId) {
    setLoadingBatch(true);
    try {
      const res = await fetchTicketBatch(batchId);
      setSelectedBatch(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoadingBatch(false);
    }
  }

  async function handleDelete(batchId, e) {
    e.stopPropagation();
    try {
      await deleteTicketBatch(batchId);
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      if (selectedBatch?.batch?.id === batchId) setSelectedBatch(null);
      setSnackbar({
        open: true,
        message: "Batch deleted.",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  }

  // --- Detail view ---
  if (selectedBatch) {
    const { batch, tickets } = selectedBatch;
    return (
      <Box sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setSelectedBatch(null)}
            size="small"
          >
            Back
          </Button>
          <Typography variant="subtitle1" fontWeight={600}>
            {batch.match_date} &mdash; {batch.ticket_count} ticket
            {batch.ticket_count !== 1 ? "s" : ""} &bull; saved{" "}
            {formatSavedAt(batch.saved_at)}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {tickets.map((matches, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <TicketCard matches={matches} idx={idx} />
            </Grid>
          ))}
        </Grid>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // --- Batch list view ---
  return (
    <Box sx={{ pt: 2 }}>
      {loadingList && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loadingList && batches.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No saved tickets yet. Generate tickets and press{" "}
          <strong>Save Tickets</strong>.
        </Typography>
      )}

      {!loadingList && batches.length > 0 && (
        <List disablePadding>
          {batches.map((b, i) => (
            <React.Fragment key={b.id}>
              {i > 0 && <Divider />}
              <ListItemButton
                onClick={() => handleSelectBatch(b.id)}
                disabled={loadingBatch}
                sx={{ py: 1.5, borderRadius: 1 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={600}>
                      {b.match_date}
                    </Typography>
                  }
                  secondary={`${b.ticket_count} ticket${b.ticket_count !== 1 ? "s" : ""} · ${b.teams_per_ticket} teams each · saved ${formatSavedAt(b.saved_at)}`}
                />
                <Tooltip title="Delete batch">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => handleDelete(b.id, e)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            </React.Fragment>
          ))}
        </List>
      )}

      {loadingBatch && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
