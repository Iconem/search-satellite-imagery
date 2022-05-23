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
import {Button, Checkbox, Radio, RadioGroup, Slider, Switch, TextField , } from '@mui/material';
import {Chip, Divider, List, Table, Tooltip, Typography} from '@mui/material';
import {Backdrop, Dialog, Link} from '@mui/material';
import {Box, Container, Grid, Stack, Paper, } from '@mui/material';
import { GlobalStyles } from '@mui/material';
import { CircularProgress, Collapse, Fab, Fade, FormControlLabel, Modal} from '@mui/material';
import { DataGrid, GridToolbar, GridColumnMenu, GridToolbarContainer, GridToolbarFilterButton, GridToolbarColumnsButton } from '@mui/x-data-grid';

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

import {search_up42, search_eos_highres, search_skywatch} from './search-apis'
import DateRangeComponent from './date-range-component'
import SettingsComponent from './settings-component'
import SearchResultsComponent from './search-results-component'


const apiKeys = {
  'UP42': {
    projectId: process.env.UP42_PROJECT_ID,
    projectApiKey: process.env.UP42_PROJECT_APIKEY,
  }, 
  'EOS': process.env.EOS_APIKEY,
  'SKYWATCH': process.env.SKYWATCH_APIKEY
}
// console.log(apiKeys)

enum Sensor {
  Pleiades,
  PleiadesNeo,
  HeadSuperview,
  HeadEarthscanner,
  Kompsat3,
  Kompsat2,
  PlanetSkysat,
  Worldview,
  HxGN,
  NearMap,
  TripleSat
}

const sensors = {
  [Sensor.Pleiades]: {gsd: 0.5},
  [Sensor.PleiadesNeo]: {gsd: 0.3},
  [Sensor.HeadSuperview]: {gsd: 0.5},
  [Sensor.HeadEarthscanner]: {gsd: 0.5},
  [Sensor.Kompsat3]: {gsd: 0.4},
  [Sensor.Kompsat2]: {gsd: 1},
  [Sensor.PlanetSkysat]: {gsd: 0.5},
  [Sensor.Worldview]: {gsd: 0.5},
  [Sensor.HxGN]: {gsd: 0.3},
  [Sensor.NearMap]: {gsd: 0.3},
  [Sensor.TripleSat]: {gsd: 0.8},
}

const providers = {
  'UP42': [Sensor.Pleiades, Sensor.PleiadesNeo, Sensor.HeadSuperview, Sensor.HeadEarthscanner, Sensor.HxGN, Sensor.NearMap],
  'SKYWATCH': [Sensor.Pleiades, Sensor.Kompsat3, Sensor.Kompsat2, Sensor.PlanetSkysat, Sensor.TripleSat],
  'EOS': [Sensor.Pleiades, Sensor.HeadSuperview, Sensor.Kompsat3, Sensor.Kompsat2],
  'SENTINELHUB': [Sensor.Pleiades, Sensor.Worldview],
}

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



function ModalComponent(props) {
  const [infoModalOpen, setInfoModalOpen] = React.useState(false);
  
  const infoModalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 10,
  };
  return (
    <>
      <Button onClick={() => setInfoModalOpen(true)}>Open modal</Button>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={infoModalOpen}>
          <Box sx={infoModalStyle}>
            <Typography id="transition-modal-title" variant="h6" component="h2">
              Text in a modal
            </Typography>
            <Typography id="transition-modal-description" sx={{ mt: 2 }}>
              Modal Test
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </>
  );
}

/* COMPONENT DEFINITION */
/* CONTROL PANEL */
// const handleSlider = (state_property) => (event: Event, newValue: number | number[]) =>
// setSearchSettings({
//   ...searchSettings, 
//   [state_property]: newValue
// })
/* -------------------- */
function ControlPanel(props) {
  const polygons = props.polygons
  
  const [endDate, setEndDate] = React.useState<Date | null>(new Date());
  const [startDate, setStartDate] = React.useState(subDays(endDate, 30));
  const [gsdIndex, setGsdIndex] = React.useState([0, 3]);

  // Fit all search settings in a single react state object
  const today = new Date()
  const [searchSettings, setSearchSettings] = React.useState({
    // polygon: null,
    startDate: subDays(today, 30), 
    endDate: today, 
    gsdIndex: [0, 3], 
    cloudCoverage: 10, 
    aoiCoverage: 90, 
    sunElevation: [60, 90], 
    offNadirAngle: [-60, 60], 
    sensorsSelection: null, 
  })

  const [searchResults, setSearchResults] = React.useState(null);
  
  const [settingsCollapsed, setSettingsCollapsed] = React.useState(false);
  const [loadingResults, setLoadingResults] = React.useState(false);

  
  /*
  use ky (based on fetch) or axios (based on xmlhttprequest older) or pure fetch which are browser based
  https://developer.vonage.com/blog/2020/09/23/5-ways-to-make-http-requests-in-node-js-2020-edition
  https://nodesource.com/blog/express-going-into-maintenance-mode

  https://docs.up42.com/developers/api#operation/getCollections
  */

  
    
  const search_imagery = async () => {
    setLoadingResults(true);
    
    let coordinates = null
    // ONLY TAKE FIRST POLYGON, flat does not work with up42 search, it considers next polygons as holes rather than union
    if (true && polygons && polygons.length && (polygons.length > 0)) {
      coordinates = polygons.map(
        p => p['geometry'].coordinates 
      )[0] // .flat()
    } else {
      console.log('\n\nCAUTION, USING DEFAULT COORDINATES FOR TESTING ONLY\n\n')
      coordinates = [
        [
          [ 0.7946123174853881, 49.52699450385825],
          [ 11.421567762222196, 49.52699450385825],
          [ 11.367348601789843, 44.311228342849404],
          [ 1.1199272800796223, 44.23386551715416],
          [ 0.7946123174853881, 49.52699450385825]
        ]
      ]
    }
    console.log(polygons, '\n Coordinates', coordinates)
    
    const search_settings = {
      coordinates, 
      startDate, endDate, 
      // cloudCoverage, sunElevation, aoiCoverage, 
      ...searchSettings,
      // gsdIndex, 
      gsd: {
        min: GSD_steps[searchSettings.gsdIndex[0]],
        max: GSD_steps[searchSettings.gsdIndex[1]],
      }
    }
    console.log(`SEARCH PARAMETERS: \n`, 
      'search_settings:', search_settings, '\n\n', 
      `cloudCoverage: ${search_settings.cloudCoverage}\n`, 
      `GSD: ${search_settings.gsdIndex.map(GSDFromIndex)}\n`, 
      `aoiCoverage: ${search_settings.aoiCoverage}%\n`, 
      `sunElevation: ${search_settings.sunElevation}°\n`, 
      `offNadirAngle: ${search_settings.offNadirAngle}°\n`, 
    )

    const { search_results_json, up42_bearer_json } = (await search_up42(search_settings, apiKeys['UP42']))
    // const { search_results_json } = (await search_eos_highres(search_settings, apiKeys['EOS'])) 
    // await search_skywatch(search_settings)
    
    setSearchResults(search_results_json)

    setLoadingResults(false);
    setSettingsCollapsed(true)
  }

  
  
  const handleGsdSlider = (event: Event, newValue: number | number[]) => {
    setGsdIndex(newValue as number[]);
  };
/* 
    WIP
*/

  const timer = React.useRef();


  React.useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    };
  }, []);

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
        <DateRangeComponent startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />

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

            <ModalComponent />
          </Stack>
        </Collapse>

        {/*  SEARCH BUTTON  */}
        <SearchButton loadingResults={loadingResults} search_imagery={search_imagery} />

        {
        searchResults && searchResults['features'] && searchResults['features'].length > 0 && !loadingResults && 
          <SearchResultsComponent searchResults={searchResults} setFootprintFeatures={props.setFootprintFeatures}/>
        }

      </div>
    </ThemeProvider>
  );
}

export default React.memo(ControlPanel);
