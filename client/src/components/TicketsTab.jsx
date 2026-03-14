import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function buildPool(teamNames, maxAppearances) {
  const pool = [];
  for (let i = 0; i < Math.max(1, maxAppearances); i++) {
    pool.push(...teamNames);
  }
  return pool;
}

function TicketCard({ teams, idx }) {
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
        subheader={`${teams.length} team${teams.length !== 1 ? "s" : ""}`}
        sx={{ pb: 0, "& .MuiCardHeader-content": { overflow: "hidden" } }}
      />
      <Divider />
      <CardContent sx={{ pt: 1, pb: "12px !important" }}>
        <List dense disablePadding>
          {teams.map((team, i) => (
            <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="body2">
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={700}
                      sx={{ mr: 1, color: "primary.main" }}
                    >
                      {i + 1}.
                    </Typography>
                    {team}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

export default function TicketsTab({ predictions = [] }) {
  const [teamsPerTicket, setTeamsPerTicket] = useState(5);
  const [maxAppearances, setMaxAppearances] = useState(1);
  const [multiCount, setMultiCount] = useState(10);
  const [tickets, setTickets] = useState([]);

  const teamNames = predictions.map((p) => p.predictedWinner);
  const noData = teamNames.length === 0;
  const perTicket = Math.max(1, teamsPerTicket);

  function handleRandomize() {
    if (noData) return;
    const pool = buildPool(teamNames, maxAppearances);
    setTickets(chunk(shuffle(pool), perTicket));
  }

  function handleMultiRandomize() {
    if (noData) return;
    let pool = buildPool(teamNames, maxAppearances);
    const times = Math.max(2, multiCount);
    for (let i = 0; i < times; i++) {
      pool = shuffle(pool);
    }
    setTickets(chunk(pool, perTicket));
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <TextField
          label="Teams per ticket"
          type="number"
          size="small"
          value={teamsPerTicket}
          onChange={(e) =>
            setTeamsPerTicket(Math.max(1, parseInt(e.target.value) || 1))
          }
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Max appearances"
          type="number"
          size="small"
          value={maxAppearances}
          onChange={(e) =>
            setMaxAppearances(Math.max(1, parseInt(e.target.value) || 1))
          }
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">per team</InputAdornment>
            ),
          }}
        />

        <Divider orientation="vertical" flexItem />

        <Button
          variant="contained"
          startIcon={<ShuffleIcon />}
          onClick={handleRandomize}
          disabled={noData}
          sx={{ height: 40 }}
        >
          Randomize
        </Button>

        <Divider orientation="vertical" flexItem />

        <TextField
          label="Shuffles"
          type="number"
          size="small"
          value={multiCount}
          onChange={(e) =>
            setMultiCount(Math.max(2, parseInt(e.target.value) || 2))
          }
          inputProps={{ min: 2 }}
          sx={{ width: 110 }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterNoneIcon />}
          onClick={handleMultiRandomize}
          disabled={noData}
          sx={{ height: 40 }}
        >
          Multi Randomize
        </Button>

        {tickets.length > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} &bull;{" "}
            {teamNames.length * Math.max(1, maxAppearances)} team slots
          </Typography>
        )}
      </Box>

      {noData && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No predictions available. Run predictions first to generate tickets.
        </Typography>
      )}

      {!noData && tickets.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          Press <strong>Randomize</strong> or <strong>Multi Randomize</strong>{" "}
          to generate betting tickets.
        </Typography>
      )}

      {tickets.length > 0 && (
        <Grid container spacing={2}>
          {tickets.map((teams, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <TicketCard teams={teams} idx={idx} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
