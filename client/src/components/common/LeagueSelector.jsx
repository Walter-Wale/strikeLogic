/**
 * LeagueSelector Component
 * Multi-select autocomplete for filtering by leagues
 */

import React from "react";
import {
  Autocomplete,
  TextField,
  Checkbox,
  Box,
  FormControlLabel,
} from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// Popular football leagues/competitions with country prefixes
const LEAGUE_OPTIONS = [
  "ENGLAND: Premier League",
  "SPAIN: LaLiga",
  "ITALY: Serie A",
  "GERMANY: Bundesliga",
  "FRANCE: Ligue 1",
  "EUROPE: Champions League",
  "EUROPE: Europa League",
  "ENGLAND: Championship",
  "NETHERLANDS: Eredivisie",
  "PORTUGAL: Liga Portugal",
  "TURKEY: Super Lig",
  "USA: MLS",
  "MEXICO: Liga MX",
  "JAPAN: J1 League",
  "AUSTRALIA: A-League",
];

const LeagueSelector = ({ value, onChange, matches }) => {
  // Get unique leagues from actual matches data
  const availableLeagues = React.useMemo(() => {
    if (!matches || matches.length === 0) return LEAGUE_OPTIONS;
    const uniqueLeagues = [
      ...new Set(
        matches
          .map((match) => match.leagueName || match.league_name)
          .filter(Boolean),
      ),
    ];
    // Sort alphabetically, country prefixes will group naturally
    return uniqueLeagues.sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const allLeaguesSelected =
    availableLeagues.length > 0 && value.length === availableLeagues.length;
  const someLeaguesSelected =
    value.length > 0 && value.length < availableLeagues.length;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "stretch", sm: "flex-start" },
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
      }}
    >
      <Autocomplete
        multiple
        id="league-selector"
        options={availableLeagues}
        disableCloseOnSelect
        value={value}
        onChange={(event, newValue) => {
          onChange(newValue);
        }}
        getOptionLabel={(option) => option}
        renderOption={({ key, ...props }, option, { selected }) => (
          <li key={key} {...props}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Filter by Leagues (Optional)"
            placeholder="All leagues"
            variant="outlined"
            fullWidth
          />
        )}
        sx={{
          flex: 1,
          minWidth: 0,
          "& .MuiAutocomplete-tag": {
            maxWidth: "150px",
          },
        }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={allLeaguesSelected}
            indeterminate={someLeaguesSelected}
            onChange={(event) => {
              onChange(event.target.checked ? availableLeagues : []);
            }}
          />
        }
        label="Select all"
        sx={{
          mt: { xs: -0.5, sm: 0.5 },
          mr: 0,
          whiteSpace: "nowrap",
          alignItems: "center",
        }}
      />
    </Box>
  );
};

export default LeagueSelector;
