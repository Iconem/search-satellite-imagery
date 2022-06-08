// Main Control Panel component calling:
// Settings Component
// Search Button calling APIs
// and Search Results Component

// WIP/TODO: 
/*
use correct draw polygon for search
search all providers
cast providers other than up42 to up42 classes features
display on map on hover on datagrid element
sat chips checkboxes https://mui.com/material-ui/react-autocomplete/#customized-hook
https://mui.com/material-ui/react-switch/#label
DRAW RECTANGLE

Timeline view
Tree view https://mui.com/material-ui/react-tree-view/#gmail-clone

pagination or infinite scroll for multiple search results
pricing of results correctly 
tooltip for provider support
modal for api key setup
chips for filters selected
circularprogress for each provider
Factor slider components
Factor text header + slider (textLeft, textRight) with child

STYLE SWITCHER using map.setStyle or react way of handling things
https://mui.com/material-ui/react-autocomplete/#checkboxes
@mui/icons-material SolarPower WbTwilight

based on https://github.com/visgl/react-map-gl/tree/7.0-release/examples/draw-polygon
*/

import * as React from 'react';

// MUI Components: Inputs | Data Display | Feedback+Nav | Layout | Mui-X-datepicker | Components API | Colors
import {Button, Checkbox, Radio, RadioGroup, Slider, Switch, TextField, } from '@mui/material';
import {Snackbar, Alert} from '@mui/material';
import {Chip, Divider, List, ListItem, Table, Tooltip, Typography} from '@mui/material';
import {Backdrop, Dialog, Link} from '@mui/material';
import {Box, Container, Grid, Stack, Paper, } from '@mui/material';
import { CircularProgress, Collapse, Fab, Fade, FormControlLabel, Modal} from '@mui/material';

// MUI Theming
import { ThemeProvider, lighten, darken } from '@mui/material/styles';
import {theme} from '../theme';

// Other imports
import { subDays } from 'date-fns'
import area from '@turf/area';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// FontAwesome icons https://fontawesome.com/icons
import { 
  faCloudSun, faChevronDown, faChevronUp, faCropSimple, 
  faGear, faDrawPolygon, faCalendarDay, faTableCells, faTableCellsLarge, 
  faGears, faSliders, faToolbox, faWrench, faEllipsis, faSquarePollVertical, faSquarePollHorizontal,
  faEarthEurope, faSatellite, faBolt
} from '@fortawesome/free-solid-svg-icons'

import {search_up42, search_eos_highres, search_skywatch, search_head, search_maxar} from './search-apis'
import DateRangeComponent from './date-range-component'
import SettingsComponent from './settings-component'
import SearchResultsComponent from './search-results-component'
import ApiKeysModalComponent from './api-keys-modal-component'


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

/* GSD */
const GSD_steps = [ 0, 0.15, 0.30, 0.50, 1, 2, 5, 15, 30];
function GSDFromIndex(gsd_index: number) {
  const GSD_meters = GSD_steps[gsd_index];
  return (GSD_meters < 1)? `${Math.floor(GSD_meters*100)}cm` : `${GSD_meters}m`;
}

function SearchButton(props) {
  const handleLoadingButtonClick = () => {
    if (!props.loadingResults) {
      props.search_imagery()
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ m: 1, position: 'relative', width: '100%' }}>
        <Button
          variant="contained"
          sx={{width: '100%'}}
          disabled={props.loadingResults}
          onClick={handleLoadingButtonClick}
        >
          SEARCH
        </Button>
        {props.loadingResults && (
          <CircularProgress
            size={24}
            sx={{
              color: theme.palette.primary.main,
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: '-12px',
              marginLeft: '-12px',
            }}
          />
        )}
      </Box>
    </Box>
  );
}


const emptyFeatureCollection = {
  features: [],
  type: "FeatureCollection"
}
const search_imagery = async (polygons, searchSettings, apiKeys, setters) => {
  setters.setLoadingResults(true);
  const searchResults = JSON.parse(JSON.stringify(emptyFeatureCollection)) // Deep Copy
  setters.setSearchResults(searchResults)
  
  // ONLY TAKE FIRST POLYGON, flat does not work with up42 search, it considers next polygons as holes rather than union
  let coordinates = null
  if (polygons && polygons.length && (polygons.length > 0)) {
    coordinates = polygons.map(
      p => p['geometry'].coordinates 
    )[0] // .flat()
  } else {
    console.log('\n\nCAUTION, USING DEFAULT COORDINATES FOR TESTING ONLY\n\n')
    coordinates = [
      [
        [ 2.3155246324913605, 48.882101638838435],
        [ 2.3730642712838232, 48.882101638838435],
        [ 2.3730642712838232, 48.831624620496],
        [ 2.3155246324913605, 48.831624620496],
        [ 2.3155246324913605, 48.882101638838435]
      ]
    ],
    setters.setSnackbarOptions({
      open: true, 
      message: 'Default Coordinates used since no polygon has been drawn'
    })
  }
  
  const searchPolygon = {
    geometry: {coordinates, type:'Polygon'},
    type: "Feature",
    properties: {}
  }
  console.log(polygons, '\n Coordinates', coordinates, searchPolygon)
  // const search_polygon = polygons && polygons.length && (polygons.length > 0) && polygons[0]
  
  if (area(searchPolygon as any) / 1_000_000 > 100_000 ) {
    setters.setSnackbarOptions({
      open: true, 
      message: 'Polygon-0 AOI Area > 100.000 km2'
    })
  }

  const search_settings = {
    coordinates, 
    // startDate, endDate, 
    ...searchSettings,
    // gsdIndex, 
    gsd: {
      min: GSD_steps[searchSettings.gsdIndex[0]],
      max: GSD_steps[searchSettings.gsdIndex[1]],
    }
  }
  console.log(`SEARCH PARAMETERS: \n`, 
    'search_settings:\n', search_settings, '\n\n', 
    `startDate: ${search_settings.startDate}\n`, 
    `endDate: ${search_settings.endDate}\n`, 
    `cloudCoverage: ${search_settings.cloudCoverage}\n`, 
    `GSD: ${search_settings.gsdIndex.map(GSDFromIndex)}\n`, 
    `aoiCoverage: ${search_settings.aoiCoverage}%\n`, 
    `sunElevation: ${search_settings.sunElevation}°\n`, 
    `offNadirAngle: ${search_settings.offNadirAngle}°\n`, 
  )
  
  function update_search_results(new_results) {
    searchResults.features.push(...new_results.features)
    setters.setSearchResults(searchResults)
  }

  /**/ 
  // PROMISES FOR EACH SEARCH API
  // const [r1, r2] = await Promise.all([
  // const a = await Promise.all([
  Promise.all([
    new Promise(async resolve => {
      const { search_results_json:search_results_json_up42, up42_bearer_json } = (await search_up42(search_settings, apiKeys['UP42'], searchPolygon))
      update_search_results(search_results_json_up42)
      resolve(search_results_json_up42)
      // return search_results_json_up42
    }),
    // new Promise(async resolve => {
    //   const { search_results_json:search_results_json_eos } = await search_eos_highres(search_settings, apiKeys['EOS']) 
    //   update_search_results(search_results_json_eos)
    //   resolve(search_results_json_eos)
    //   // return search_results_json_eos
    // }),
    // new Promise(async resolve => {
    //   const { search_results_json:search_results_json_skywatch } = await search_skywatch(search_settings, apiKeys['SKYWATCH'])
    //   update_search_results(search_results_json_skywatch)
    //   resolve(search_results_json_skywatch)
    //   // return search_results_json_skywatch
    // }),
    new Promise(async resolve => {
      const { search_results_json:search_results_json_head } = await search_head(search_settings, searchPolygon)
      update_search_results(search_results_json_head)
      resolve(search_results_json_head)
      // return search_results_json_skywatch
    }),
    new Promise(async resolve => {
      const { search_results_json:search_results_json_maxar } = await search_maxar(search_settings, apiKeys['MAXAR_DIGITALGLOBE'], searchPolygon)
      update_search_results(search_results_json_maxar)
      resolve(search_results_json_maxar)
      // return search_results_json_maxar
    })
  ])
  .then((results) => {
    console.log('ALL PROMISE END', results);
    setters.setSearchResults(emptyFeatureCollection)
    results.forEach(r => update_search_results(r))
    setters.setLoadingResults(false);
    setters.setSettingsCollapsed(true)
  });
  console.log('outside PROMISE END');
  // console.log('AWAIT PROMISE END', r1, r2);
  /**/

  /*
  // const { search_results_json:search_results_json_up42, up42_bearer_json } = (await search_up42(search_settings, apiKeys['UP42'], searchPolygon))
  // update_search_results(search_results_json_up42)
  // const { search_results_json:search_results_json_eos } = await search_eos_highres(search_settings, apiKeys['EOS']) 
  // update_search_results(search_results_json_eos)
  // const { search_results_json:search_results_json_skywatch } = await search_skywatch(search_settings, apiKeys['SKYWATCH'])
  // update_search_results(search_results_json_skywatch)
  const { search_results_json:search_results_json_head } = await search_head(search_settings, searchPolygon)
  update_search_results(search_results_json_head)
  
  // setters.setSearchResults(search_results_json);
  // REMOVE WITH PROMISES 
  setters.setLoadingResults(false);
  setters.setSettingsCollapsed(true)
  */
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
  const [searchSettings, setSearchSettings] = React.useState({
    // polygon: null,
    startDate: subDays(today, 3000), // 30
    endDate: today, 
    gsdIndex: [0, 4], 
    cloudCoverage: 20, 
    aoiCoverage: 80, 
    sunElevation: [50, 90], 
    offNadirAngle: [-60, 60], 
    sensorsSelection: null, 
  })

  const [apiKeys, setApiKeys] = React.useState({
    'UP42': {
      projectId: process.env.UP42_PROJECT_ID,
      projectApiKey: process.env.UP42_PROJECT_APIKEY,
    }, 
    'EOS': process.env.EOS_APIKEY,
    'SKYWATCH': process.env.SKYWATCH_APIKEY,
    'MAXAR_DIGITALGLOBE': process.env.MAXAR_DIGITALGLOBE_APIKEY,
  })
  // console.log(apiKeys)
  
  const setStartDate = (newValue: Date | null) => setSearchSettings({
    ...searchSettings, 
    'startDate': newValue
  })
  const setEndDate = (newValue: Date | null) => setSearchSettings({
    ...searchSettings, 
    'endDate': newValue
  })
  
  const [loadingResults, setLoadingResults] = React.useState(false);

  const [settingsCollapsed, setSettingsCollapsed] = React.useState(false);
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
    
  // const handleGsdSlider = (event: Event, newValue: number | number[]) => {
  //   setGsdIndex(newValue as number[]);
  // };
/* 
    WIP
*/
  // (event: SyntheticEvent<Element, Event>) => void
/*
  const timer = React.useRef();
  React.useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    };
  }, []);
*/
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
          width: '400px',
          minWidth: '400px', 

          position: 'absolute',
          top: '3%',
          right: 0,
          maxWidth: '480px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          padding: '12px 24px',
          marginRight: '20px',
          outline: 'none',
          maxHeight: '94%',
          overflow: 'auto',
        }}
      >
        {/* TITLE */}
        <Typography gutterBottom>
          Retrieve Satellite Imagery
        </Typography>
        <Box sx={{ m: 1 }}/>

        {/* AOI and DateRange Components */}
        <AOIComponent polygons={polygons} />
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
        <SearchButton 
          loadingResults={loadingResults} 
          search_imagery={() => 
            search_imagery(polygons, searchSettings, apiKeys, {setLoadingResults, setSearchResults: props.setSearchResults, setSettingsCollapsed, setSnackbarOptions})
          } 
        />
        <Snackbar
          open={snackbarOptions.open}
          autoHideDuration={2000}
          onClose={handleSnackbarClose}
          // message={snackbarOptions.message}
        >
          <Alert onClose={handleSnackbarClose} severity="warning" sx={{ width: '100%' }}>
            {snackbarOptions.message}
          </Alert>
        </Snackbar>

        {
        props.searchResults && props.searchResults['features'] && props.searchResults['features'].length > 0 && 
          <SearchResultsComponent searchResults={props.searchResults} setFootprintFeatures={props.setFootprintFeatures}/>
        }

      </div>
    </ThemeProvider>
  );
}

export default React.memo(ControlPanel);
