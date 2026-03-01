/**
 * DatePicker Component
 * Allows user to select a match date
 */

import React from "react";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField } from "@mui/material";

const DatePicker = ({ value, onChange }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        label="Select Match Date"
        value={value}
        onChange={onChange}
        format="DD/MM/YYYY"
        slotProps={{
          textField: {
            fullWidth: true,
            variant: "outlined",
          },
        }}
        renderInput={(params) => <TextField {...params} fullWidth />}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;
