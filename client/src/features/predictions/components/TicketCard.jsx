import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { getTicketPickMeta } from "../utils/ticketFormatters";

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
                    {/* Home team — bold + green if winner */}
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
                    {/* Away team — bold + green if winner */}
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

export default TicketCard;
