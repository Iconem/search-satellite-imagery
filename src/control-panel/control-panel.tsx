// Main Control Panel component calling:
// Settings Component
// Search Button calling APIs
// and Search Results Component

// WIP/TODO: 
/*
circular progress for each provider
sat chips checkboxes https://mui.com/material-ui/react-autocomplete/#customized-hook
https://mui.com/material-ui/react-switch/#label
Tree view https://mui.com/material-ui/react-tree-view/#gmail-clone
pagination or infinite scroll for multiple search results
tooltip for provider support
*/

import * as React from 'react';

// MUI Components: Inputs | Data Display | Feedback+Nav | Layout | Mui-X-datepicker | Components API | Colors
import {Button} from '@mui/material';
import {Snackbar, Alert} from '@mui/material';
import {Divider, List, ListItem, Table, Tooltip, Typography, ListItemText, ListItemIcon} from '@mui/material';
import {Box, Container, Grid, Stack, } from '@mui/material';
import { CircularProgress, LinearProgress, Collapse} from '@mui/material';

// MUI Theming
import { ThemeProvider, lighten, darken } from '@mui/material/styles';
import {theme} from '../theme';

// Other imports
import { subDays } from 'date-fns'
import area from '@turf/area';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// FontAwesome icons https://fontawesome.com/icons
import { 
  faChevronDown, faChevronUp, faDownload, faDrawPolygon, faSliders, faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { v4 as uuidv4 } from 'uuid';

// import {search_up42, search_eos_highres, search_skywatch, search_head, search_maxar} from './search-apis'
import {search_up42, get_up42_previews_async} from '../archive-apis/search-up42'
import search_head from '../archive-apis/search-head'
import search_maxar from '../archive-apis/search-maxar'
import search_skywatch from '../archive-apis/search-skywatch'
import search_eos_highres from '../archive-apis/search-eos'
import {Providers} from '../archive-apis/search-utilities'

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


/* API Request Status */
function APIRequestsStatuses(props) {
  return (
    <>
    {(props.searchPromises 
      && !Object.values(props.searchPromises).every((o:any) => o.searchFinishedForMoreThanDelay)) 
      && 
    <List dense={true}>
      {Object.values(props.searchPromises)
        .filter((o:any) => !o.searchFinishedForMoreThanDelay)
        .map((o:any) => (
        <ListItem>
          <ListItemIcon>
            {!o.searchFinished ? ( <Typography>...</Typography>) : (<FontAwesomeIcon icon={faCheck} /> )}
          </ListItemIcon>
          <ListItemText
            primary={
              !o.searchFinished ?
              `Searching ${o.provider}...` : 
              `Results returned by ${o.provider} API!`
              // `${props.searchResults?.output?.features?.filter(f => f.properties.providerName.toLowerCase().includes(o.provider.toLowerCase())).length} results returned by o.provider!`
            }
            secondary={null}
          />
        </ListItem>
      )
      )}
    </List>
    }
    </>
  )
}


/* Search Button */
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

/* Export Button has GeoJSON logic */
function ExportButton(props) {
  function handleExportButtonClick() {
    const geojson_obj = JSON.parse(JSON.stringify(props.searchResults.output)) // deep copy
    geojson_obj.features.forEach(f => {
      f.properties['fill-opacity'] = 0;
      f.properties['stroke-width'] = 1;
    })

    geojson_obj.features.unshift(props.searchResults.input)

    const fileData = JSON.stringify(geojson_obj);
    const blob = new Blob([fileData], { type: "text/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.click();
    link.download = "search-results.geojson";
    link.href = url;
    link.click();

    // Could define these styles for each geojson feature properties, and use QGIS/Fill-Color/Data-Defined-Overrides/Field-type:string 
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ m: 1, position: 'relative', width: '100%' }}>
        <Button
          variant="contained"
          sx={{width: '100%', minWidth: '0'}}
          disabled={!(props.searchResults?.output?.['features']?.length > 0)}
          onClick={handleExportButtonClick}
        >
          <Tooltip title={'Export results as GeoJSON'}>
          <strong> <FontAwesomeIcon icon={faDownload} /> </strong>
          </Tooltip> 
        </Button>
      </Box>
    </Box>
  );
}


// -----------------------------------
//     SEARCH API LOGIC
// -----------------------------------

const providers_search = {
  [Providers.UP42]: search_up42,
  [Providers.HEADAEROSPACE]: search_head,
  [Providers.MAXAR_DIGITALGLOBE]: search_maxar,
  [Providers.EOS]: search_eos_highres,
  [Providers.SKYWATCH]: search_skywatch,
}

const emptyFeatureCollection = {
  features: [],
  type: "FeatureCollection"
}
const hideSearchDelay = 5000
const search_imagery = async (polygons, searchSettings, apiKeys, setters) => {
  setters.setLoadingResults(true);
  const searchResultsOutput = JSON.parse(JSON.stringify(emptyFeatureCollection)) // Deep Copy
  
  // ONLY TAKE FIRST POLYGON, flat does not work with up42 search, it considers next polygons as holes rather than union
  let coordinates = null
  if (polygons?.length) {
    if (polygons.length == 1) {
      coordinates = polygons.map(
        p => p['geometry'].coordinates 
      )[0] // .flat()
    } else if (polygons.length >= 1) {
      console.log('\n\nCAUTION, USE A SINGLE POLYGON\n\n')
      setters.setSnackbarOptions({
        open: true, 
        message: 'More than 1 Polygon found, either delete the unwanted AOIs or start over!'
      })
      return null
    }
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
      message: 'Default Polygon (Paris area) used since no rectangle polygon has been drawn!'
    })
  }
  
  const searchPolygon = {
    geometry: {coordinates, type:'Polygon'},
    type: "Feature",
    properties: {
      ...searchSettings,
      id: uuidv4(),
      // gsdIndex, 
      acquisitionDate: searchSettings.startDate,
      gsd_min: GSD_steps[searchSettings.gsdIndex[0]],
      gsd_max: GSD_steps[searchSettings.gsdIndex[1]],
      constellation: 'SEARCH_INPUT_PARAMS',
      provider: 'SEARCH_INPUT_PARAMS',
      providerPlatform: 'SEARCH_INPUT_PARAMS',
      sensor: 'SEARCH_INPUT_PARAMS',
      price: 0,
      resolution: 0,
      shapeIntersection: 100,

      // Styles for geojson.io or qgis fill data-driven-override
      'fill': '#f00',
      'fill-opacity': 0.3,
      'stroke-width': 1,
    }
  }
  const searchResults = {
    'input': searchPolygon,
    'output': searchResultsOutput,
  }
  setters.setSearchResults(searchResults)

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
    `GSD: ${search_settings.gsdIndex.map(GSDFromIndex)}\n`, 
  )
  
  function update_search_results(new_results) {
    if (new_results) {
      console.log('length before push', searchResults.output.features.length)
      // The below two lines commented out wont work because no change in shallow equality check
      // searchResults.output.features.push(...new_results.features)
      // setters.setSearchResults(searchResults)
      setters.setSearchResults({
        input: searchResults.input, // either ...searchResults, or input: searchResults.input, or simply 
        output: {
          type: 'FeatureCollection', 
          features: [
            ...searchResults.output.features, 
            ...new_results.features
          ]
        }
      })
      searchResults.output.features.push(...new_results.features)
      console.log('length after push', searchResults.output.features.length)
    }
  }
  // update_search_results(searchPolygon)

  // PROMISES FOR EACH SEARCH API
  const search_promises = Object.fromEntries( // build a dict from a dict via an array of key-value pairs
    Object.keys(providers_search).map(
      provider => {
        return [
          provider, 
          {
            provider, 
            searchFinished: false,
            searchFinishedForMoreThanDelay: false,
            promise: new Promise(async resolve => {
              const { search_results_json } = await providers_search[provider]
                (search_settings, apiKeys[provider], searchPolygon, setters.setSnackbarOptions)
              update_search_results(search_results_json)
              resolve(search_results_json)
              search_promises[provider].searchFinished = true
              // setters.setSearchPromises(search_promises)
              setters.setSearchPromises({
                ...search_promises,
                [provider]: {
                  ...search_promises[provider],
                  searchFinished: true
                }
              })
              // console.log('PROMISES ARRAY AFTER PROVIDER', provider, search_promises)

              setTimeout(() => {
                search_promises[provider].searchFinishedForMoreThanDelay = true
                // setters.setSearchPromises(search_promises)
                setters.setSearchPromises({
                  ...search_promises,
                  [provider]: {
                    ...search_promises[provider],
                    searchFinishedForMoreThanDelay: true
                  }
                })
              }, hideSearchDelay);
            })
          }
        ]
      }
    )
  )
  setters.setSearchPromises(search_promises)
  console.log('\n\nPROMISES\n\n', search_promises)
  Promise.all(Object.values(search_promises).map (o => o.promise))
  .then((results) => {
    setters.setLoadingResults(false);
    setters.setSettingsCollapsed(true)
    console.log('finished requests for all promises', results)
  })
  
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
    startDate: subDays(today, 1200), // 30
    endDate: today, 
    gsdIndex: [0, 4], 
    cloudCoverage: 20, 
    aoiCoverage: 80, 
    sunElevation: [50, 90], 
    offNadirAngle: [-60, 60], 
    sensorsSelection: null, 
  })

  const [apiKeys, setApiKeys] = React.useState({
    [Providers.UP42]: {
      projectId: process.env.UP42_PROJECT_ID,
      projectApiKey: process.env.UP42_PROJECT_APIKEY,
    }, 
    [Providers.EOS]: process.env.EOS_APIKEY,
    [Providers.SKYWATCH]: process.env.SKYWATCH_APIKEY,
    [Providers.MAXAR_DIGITALGLOBE]: process.env.MAXAR_DIGITALGLOBE_APIKEY,
  })
  
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

  const setters = {
    setSearchPromises, 
    setLoadingResults, 
    setSearchResults: props.setSearchResults, 
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
            loadingResults={loadingResults} 
            setSearchResults= {props.setSearchResults}
            search_imagery={() => 
              search_imagery(polygons, searchSettings, apiKeys, setters)
            } 
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
