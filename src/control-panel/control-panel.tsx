// Main Control Panel component calling:
// Settings Component
// Search Button calling APIs
// and Search Results Component

// WIP/TODO: 
/*
https://mui.com/material-ui/react-switch/#label
Tree view https://mui.com/material-ui/react-tree-view/#gmail-clone
*/

import * as React from 'react';

// MUI Components: Inputs | Data Display | Feedback+Nav | Layout | Mui-X-datepicker | Components API | Colors
import {Snackbar, Alert, Collapse, Box, Grid, Stack, Typography, Slider} from '@mui/material';

// MUI Theming
import { ThemeProvider, lighten, darken } from '@mui/material/styles';
import {theme} from '../theme';

// Other imports
import {useLocalStorage} from '../utilities';
import { subDays } from 'date-fns'
import area from '@turf/area';
// FontAwesome icons https://fontawesome.com/icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faChevronDown, faChevronUp, faDownload, faDrawPolygon, faSliders, faCheck, faSatelliteDish
} from '@fortawesome/free-solid-svg-icons'

import {Providers} from '../archive-apis/search-utilities'

import DateRangeComponent from './date-range-component'
import SettingsComponent from './settings-component'
import SearchResultsComponent from './search-results-component'
import ApiKeysModalComponent from './api-keys-modal-component'
import SearchButton from './search-button'
import ExportButton from './export-button'
import APIRequestsStatuses from './api-requests-statuses'
import { GSD_steps } from '../utilities'

/* Display COMPONENTS */
/* AOI area COMPONENT */
function AOIComponent(props) {
  let polygonArea = 0;
  for (const polygon of props.polygons) {
    polygonArea += area(polygon);
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={5}> <Typography variant="subtitle2"><FontAwesomeIcon icon={faDrawPolygon} />
        &nbsp; AOI area: </Typography> </Grid>
        <Grid item xs={7}> <Typography align={'right'} variant="subtitle2"> {
        polygonArea > 0 ? ( `${Math.round(polygonArea / 1_000_000 * 100) / 100}km²` ) : 'Not Defined'} </Typography></Grid>
      </Grid>
    </>
  );
}

/* COMPONENTS DEFINITION */
/* CONTROL PANEL */
/* -------------------- */
// const handleSlider = (state_property) => (event: Event, newValue: number | number[]) =>
// setSearchSettings({
//   ...searchSettings, 
//   [state_property]: newValue
// })
function ControlPanel(props) {
  const polygons = props.polygons
  // Fit all search settings in a single react state object
  const today = new Date()
  const [searchSettings, setSearchSettings] = useLocalStorage('searchSettings', {
    // polygon: null,
    startDate: subDays(today, 1200), // 30
    endDate: today, 
    gsdIndex: [0, 4], 
    cloudCoverage: 20, 
    aoiCoverage: 80, 
    sunElevation: [50, 90], 
    offNadirAngle: [-60, 60], 
    sensorsSelection: null, 
  });
  if (typeof searchSettings.startDate === 'string' || searchSettings.startDate instanceof String) {
    setSearchSettings({
      ...searchSettings,
      startDate: new Date(searchSettings.startDate), 
      endDate: new Date(searchSettings.endDate),
    })
  }

  const [apiKeys, setApiKeys] = useLocalStorage('apiKeys', {
      [Providers.UP42]: {
        projectId: process.env.UP42_PROJECT_ID,
        projectApiKey: process.env.UP42_PROJECT_APIKEY,
      }, 
      [Providers.EOS]: process.env.EOS_APIKEY,
      [Providers.SKYWATCH]: process.env.SKYWATCH_APIKEY,
      [Providers.MAXAR_DIGITALGLOBE]: process.env.MAXAR_DIGITALGLOBE_APIKEY,
    });
  
  const setStartDate = (newValue: Date | null) => setSearchSettings({
    ...searchSettings, 
    'startDate': newValue
  })
  const setEndDate = (newValue: Date | null) => setSearchSettings({
    ...searchSettings, 
    'endDate': newValue
  })
  
  const [loadingResults, setLoadingResults] = React.useState(false);
  const [searchPromises, setSearchPromises] = React.useState([]);

  // const [settingsCollapsed, setSettingsCollapsed] = React.useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useLocalStorage('settingsCollapsed', false);
  const [snackbarOptions, setSnackbarOptions] = React.useState({
    open: false, 
    message: ''
  });
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOptions({
      open: false, 
      message: ''
    });
  };

  const setters = {
    setSearchResults: props.setSearchResults, 
    setSearchPromises, 
    setLoadingResults, 
    setSettingsCollapsed, 
    setSnackbarOptions
  }
    
  return (
    <ThemeProvider theme={theme}>
      {/* 
      <Container sx={{
        background: theme.palette.background.default,
        color: theme.palette.text.primary}}>TOTO</Container> 
      */ }

      <div 
        className="control-panel" 
        style={{
          background: theme.palette.background.default,
          color: theme.palette.text.primary, 
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          // minWidth: '400px', 

          // position: 'absolute',
          right: 0,
          // maxWidth: '480px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          padding: '12px 24px',
          outline: 'none',
          overflow: 'auto',
        }}
      >
      <div 
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexFlow: 'column',
          height: '100%',
        }}
      >
        {/* TITLE */}
        <Typography gutterBottom>
          Retrieve Satellite Imagery
        </Typography>
        <Box sx={{ m: 1 }}/>

        {/* AOI and DateRange Components */}
        <AOIComponent polygons={polygons} />
        {/* setRasterOpacity={props.setRasterOpacity} */}
        <Slider
          min= {0} max= {1} step= {0.01}
          size= {'small'}
          valueLabelDisplay= {'auto'}
          value={props.rasterOpacity}
          onChange={(event: Event, newValue: number | number[]) => props.setRasterOpacity(newValue)}
          valueLabelFormat={value => `Imagery Opacity: ${value*100}%`}
        />
        {/* <DateRangeComponent startDate={searchSettings.startDate} setStartDate={setStartDate} endDate={searchSettings.endDate} setEndDate={setEndDate} /> */}
        <DateRangeComponent startDate={searchSettings.startDate} setStartDate={setStartDate} endDate={searchSettings.endDate} setEndDate={setEndDate} />


        {/* SETTINGS Component */}
        <Typography 
          variant="subtitle1" 
          onClick={ () => setSettingsCollapsed(!settingsCollapsed) }
          sx={{cursor: 'pointer', zIndex: 10}}
        >
          <FontAwesomeIcon icon={faSliders} /> 
          &nbsp; Settings &nbsp; 
          {
            settingsCollapsed ? 
            <FontAwesomeIcon icon={faChevronDown} /> : 
            <FontAwesomeIcon icon={faChevronUp} />
          }
        </Typography>
        <Collapse in={!settingsCollapsed} timeout="auto" unmountOnExit>
          <Stack spacing={2} > 
            <SettingsComponent 
              searchSettings={searchSettings} setSearchSettings={setSearchSettings} 
              GSD_steps={GSD_steps} 
            />

            <ApiKeysModalComponent apiKeys={apiKeys} setApiKeys={setApiKeys} />
          </Stack>
        </Collapse>

        {/*  SEARCH BUTTON  */}
        <Grid container spacing={2}>
          <Grid item xs={11}>
          <SearchButton
            setters={setters} /* among which the important setSearchResults */
            polygons= {polygons}
            searchSettings={searchSettings}
            apiKeys={apiKeys}
            loadingResults={loadingResults} 
          />
          </Grid>
          <Grid item xs={1}>
            <ExportButton 
              searchResults={props.searchResults}
              />
          </Grid>
        </Grid>
        <APIRequestsStatuses 
          searchPromises= {searchPromises}
          searchResults={props.searchResults}
        />
        <Snackbar
          open={snackbarOptions.open}
          autoHideDuration={5000}
          onClose={handleSnackbarClose}
          // message={snackbarOptions.message}
        >
          <Alert onClose={handleSnackbarClose} severity="warning" sx={{ width: '100%' }}>
            {snackbarOptions.message}
          </Alert>
        </Snackbar>

        {
        props.searchResults?.output?.features?.length > 0 && 
          <SearchResultsComponent searchResults={props.searchResults.output} setFootprintFeatures={props.setFootprintFeatures}/>
        }

      </div>
      </div>
    </ThemeProvider>
  );
}

export default React.memo(ControlPanel);
