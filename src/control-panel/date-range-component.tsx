// DateRange component based on simple mui datepickers since the daterange requires an muix-pro subscription

import * as React from 'react'
import { styled } from '@mui/system'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

import { Typography, Grid } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'

/* DATE RANGE COMPONENT */
const MyDatePicker = styled(DatePicker)({
  fontSize: '10px',
  '& .MuiFormControl-root': {
    width: '100%',
    fontSize: '10px',
  },
  '& .MuiOutlinedInput-input': {
    padding: '6px',
  },
  '.MuiOutlinedInput-input ': {
    padding: '6px',
  },
})
DateRangeComponent.propTypes = {
  startDate: PropTypes.any,
  endDate: PropTypes.any,
  setStartDate: PropTypes.func,
  setEndDate: PropTypes.func,
}
function DateRangeComponent(props): React.ReactElement {
  const startDateLowerThanEndDate = props.startDate <= props.endDate
  return (
    <>
      <Typography variant="subtitle2">
        <FontAwesomeIcon icon={faCalendarDay} />
        &nbsp; Date Range
      </Typography>
      <Grid container>
        <Grid item xs={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MyDatePicker
              maxDate={new Date()}
              label="From"
              value={props.startDate}
              onChange={props.setStartDate}
              sx={{ width: '100%' }}
              // renderInput={(params): React.ReactElement => (
              //   <TextField
              //     {...params}
              //     size="small"
              //     sx={{ width: '100%' }} // '150px'
              //     error={!startDateLowerThanEndDate}
              //     {...(!startDateLowerThanEndDate ? { helperText: 'Bad date ordering' } : {})} //
              //   />
              // )}
              componentsProps={{
                textField: {
                  size: 'small',
                  sx: { width: '100%' },
                  error: !startDateLowerThanEndDate,
                  helperText: !startDateLowerThanEndDate ? 'Bad Date Ordering' : '',
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MyDatePicker
              maxDate={new Date()}
              label="To"
              value={props.endDate}
              onChange={props.setEndDate}
              sx={{ width: '100%' }}
              // renderInput={(params): React.ReactElement => (
              //   <TextField
              //     {...params}
              //     size="small"
              //     sx={{ width: '100%' }} // '150px'
              //     error={!startDateLowerThanEndDate}
              //   />
              // )}
              componentsProps={{
                textField: {
                  size: 'small',
                  sx: { width: '100%' },
                  error: !startDateLowerThanEndDate,
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>
    </>
  )
}

export default React.memo(DateRangeComponent)
