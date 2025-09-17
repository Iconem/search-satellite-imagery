// Main Control Panel component calling:
// Settings Component
// Search Button calling APIs
// and Search Results Component

// WIP/TODO:
/*
https://mui.com/material-ui/react-switch/#label
Tree view https://mui.com/material-ui/react-tree-view/#gmail-clone
*/

import * as React from 'react'

// MUI Components: Inputs | Data Display | Feedback+Nav | Layout | Mui-X-datepicker | Components API | Colors
import { Snackbar, Alert, Collapse, Box, Grid, Stack, Typography, Link } from '@mui/material'

// Other imports
import { useLocalStorage, GSD_STEPS, log } from '../utilities'
import area from '@turf/area'
// FontAwesome icons https://fontawesome.com/icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faDrawPolygon, faSliders, faEarthEurope } from '@fortawesome/free-solid-svg-icons'
import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons'
import { getUp42Bearer, getDataCollections, extractUp42HostsWithGsd } from '../archive-apis/search-up42'
import { Providers, providersDict as initialProvidersDict, constellationDict as initialConstellationDict } from '../archive-apis/search-utilities'
import PropTypes from 'prop-types'
import DateRangeComponent from './date-range-component'
import SettingsComponent from './settings-component'
import SearchResultsComponent from './search-results-component'
import ApiKeysModalComponent from './api-keys-modal-component'
import SearchButton from './search-button'
import ExportButton from './export-button'
import APIRequestsStatuses from './api-requests-statuses'
import { sourcesTreeviewInitialSelection, buildTreeviewData } from './satellite-imagery-sources-treeview'
import equal from 'fast-deep-equal';

/* Display COMPONENTS */
/* AOI area COMPONENT */
AOIComponent.propTypes = {
  polygons: PropTypes.any,
}
function AOIComponent(props): React.ReactElement {
  let polygonArea = 0
  for (const polygon of props.polygons) {
    polygonArea += area(polygon)
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={5}>
          {' '}
          <Typography variant="subtitle2">
            <FontAwesomeIcon icon={faDrawPolygon} />
            &nbsp; AOI area:{' '}
          </Typography>{' '}
        </Grid>
        <Grid item xs={7}>
          {' '}
          <Typography align={'right'} variant="subtitle2">
            {' '}
            {polygonArea > 0 ? `${Math.round((polygonArea / 1_000_000) * 100) / 100}km²` : 'Not Defined'}{' '}
          </Typography>
        </Grid>
      </Grid>
    </>
  )
}

/* COMPONENTS DEFINITION */
/* CONTROL PANEL */
/* -------------------- */
const millisecondsPerDay = 24 * 60 * 60 * 1000
ControlPanel.propTypes = {
  polygons: PropTypes.any,
  searchResults: PropTypes.any,
  setSearchResults: PropTypes.func,
  footprintFeatures: PropTypes.any,
  setFootprintFeatures: PropTypes.func,
  mapRef: PropTypes.any,
  theme: PropTypes.any,
}

interface ControlPanelProps {
  polygons?: any;
  searchResults?: any;
  setSearchResults?: (value: any) => void;
  footprintFeatures?: any;
  setFootprintFeatures?: (value: any) => void;
  mapRef?: any;
  theme?: any;
}
function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const polygons = props.polygons
  // Fit all search settings in a single react state object
  const today = new Date()
  const [searchSettings, setSearchSettings] = useLocalStorage('searchSettings', {
    startDate: new Date(today.getTime() - 1200 * millisecondsPerDay), // 30
    endDate: today,
    gsdIndex: [0, 4],
    cloudCoverage: 20,
    aoiCoverage: 80,
    sunElevation: [50, 90],
    offNadirAngle: [-60, 60],
    sensorsSelection: null,
  })
  if (typeof searchSettings.startDate === 'string' || searchSettings.startDate instanceof String) {
    setSearchSettings({
      ...searchSettings,
      startDate: new Date(searchSettings.startDate),
      endDate: new Date(searchSettings.endDate),
    })
  }

  const [apiKeys, setApiKeys] = useLocalStorage('apiKeys', {
    [Providers.UP42]: {
      up42Email: '',
      up42Password: '',
    },
    [Providers.EOS]: '',
    [Providers.SKYWATCH]: '',
    [Providers.MAXAR_DIGITALGLOBE]: '',
    [Providers.ARLULA]: {
      apiKey: '',
      apiSecurity: '',
    },
  })
  // [Providers.UP42]: {
  //   projectId: process.env.UP42_PROJECT_ID,
  //   projectApiKey: process.env.UP42_PROJECT_APIKEY,
  // },
  // [Providers.EOS]: process.env.EOS_APIKEY,
  // [Providers.SKYWATCH]: process.env.SKYWATCH_APIKEY,
  // [Providers.MAXAR_DIGITALGLOBE]: process.env.MAXAR_DIGITALGLOBE_APIKEY,

  const setStartDate = (newValue: Date | null): void =>
    setSearchSettings({
      ...searchSettings,
      startDate: newValue,
    })
  const setEndDate = (newValue: Date | null): void =>
    setSearchSettings({
      ...searchSettings,
      endDate: newValue,
    })

  const [loadingResults, setLoadingResults] = React.useState(false)
  const [searchPromises, setSearchPromises] = React.useState([])
  const [settingsCollapsed, setSettingsCollapsed] = useLocalStorage('UI_collapsed_settings', false)
  const [snackbarOptions, setSnackbarOptions] = React.useState({
    open: false,
    message: '',
  })
  const handleSnackbarClose = (event, reason): void => {
    if (reason === 'clickaway') {
      return
    }
    setSnackbarOptions({
      open: false,
      message: '',
    })
  }

  //get Bearer and datacollection for UP42
  const [dataCollection, setDataCollection] = useLocalStorage(
    "dataCollection",
    []
  )
  const [providersTreeviewDataSelection, setProvidersTreeviewDataSelection] = useLocalStorage(
    'providersTreeviewDataSelection',
    []
  )

  React.useEffect(() => {
    (async () => {
      const { up42Email, up42Password } = apiKeys[Providers.UP42];
      const newToken = await getUp42Bearer(up42Email, up42Password);

      const data = await getDataCollections(newToken, up42Email, up42Password, setters);
      setDataCollection((prev) => {
        if (equal(prev, data)) {
          return prev;
        }
        return data;
      });
    })();
  }, [apiKeys[Providers.UP42].up42Email, apiKeys[Providers.UP42].up42Password]);

  const { providersDict, constellationDict } = React.useMemo(() => {
    if (dataCollection.length === 0) {
      return { providersDict: {}, constellationDict: {} };
    }

    const up42Hosts = extractUp42HostsWithGsd(dataCollection);

    const newProvidersDict = {
      ...initialProvidersDict,
      [Providers.UP42]: up42Hosts.map(host => host.title)
    };
    const newConstellationDict: Record<string, any> = {};
    up42Hosts.forEach(host => {
      newConstellationDict[host.title] = {
        satellites: host.satellites,
        gsd: host.gsd
      };
    });

    return { providersDict: newProvidersDict, constellationDict: newConstellationDict };
  }, [dataCollection]);

  const treeviewData = React.useMemo(
    () => (dataCollection.length ? buildTreeviewData(providersDict, constellationDict) : null),
    [dataCollection, providersDict, constellationDict]
  );

  // Initialize selection when treeviewData is ready and selection is empty
  React.useEffect(() => {
    if (treeviewData && providersTreeviewDataSelection.length === 0) {
      const initialSelection = sourcesTreeviewInitialSelection(treeviewData)
      setProvidersTreeviewDataSelection(initialSelection)
    }
  }, [treeviewData])

  const setters = {
    setSearchResults: props.setSearchResults,
    setSearchPromises,
    setLoadingResults,
    setSettingsCollapsed,
    setSnackbarOptions,
  }
  const theme = props.theme

  return (
    <>
      <div
        className="control-panel"
        style={{
          background: theme.palette.background.default,
          color: theme.palette.text.primary,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          right: 0,
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
          <Grid container spacing={2}>
            <Grid item xs={9}>
              <Typography gutterBottom>Retrieve Satellite Imagery</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography fontSize={20} textAlign={'right'} color={props.theme.palette.text.primary}>
                <Link href="http://iconem.com/" title={'By Iconem'} target="_blank" color={'inherit'}>
                  <FontAwesomeIcon icon={faEarthEurope} />
                </Link>
                <Link href="https://twitter.com/iconem/" title={'Twitter'} target="_blank" color={'inherit'} style={{ margin: '8px' }}>
                  <FontAwesomeIcon icon={faTwitter} />
                </Link>
                <Link href="https://github.com/Iconem/search-satellite-imagery/" title={'Github Repo'} target="_blank" color={'inherit'}>
                  <FontAwesomeIcon icon={faGithub} />
                </Link>
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ m: 1 }} />

          {/* AOI and DateRange Components */}
          <AOIComponent polygons={polygons} />
          <DateRangeComponent startDate={searchSettings.startDate} setStartDate={setStartDate} endDate={searchSettings.endDate} setEndDate={setEndDate} />

          {/* SETTINGS Component */}
          <Typography variant="subtitle1" onClick={() => setSettingsCollapsed(!settingsCollapsed)} sx={{ cursor: 'pointer', zIndex: 10 }}>
            <FontAwesomeIcon icon={faSliders} />
            &nbsp; Settings &nbsp;
            {settingsCollapsed ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronUp} />}
          </Typography>
          <Collapse
            in={!settingsCollapsed}
            timeout="auto"
            unmountOnExit
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Stack spacing={2}>
              <SettingsComponent
                searchSettings={searchSettings}
                setSearchSettings={setSearchSettings}
                GSD_STEPS={GSD_STEPS}
                setProvidersTreeviewDataSelection={setProvidersTreeviewDataSelection}
                providersTreeviewDataSelection={providersTreeviewDataSelection}
                treeviewData={treeviewData}
              />

              <ApiKeysModalComponent apiKeys={apiKeys} setApiKeys={setApiKeys} />
            </Stack>
          </Collapse>

          {/*  SEARCH BUTTON  */}
          <Grid container spacing={2}>
            <Grid item xs={11}>
              <SearchButton
                theme={props.theme}
                setters={setters} /* among which the important setSearchResults */
                polygons={polygons}
                searchSettings={searchSettings}
                apiKeys={apiKeys}
                loadingResults={loadingResults}
                providersTreeviewDataSelection={providersTreeviewDataSelection}
              />
            </Grid>
            <Grid item xs={1}>
              <ExportButton searchResults={props.searchResults} />
            </Grid>
          </Grid>
          <APIRequestsStatuses theme={props.theme} searchPromises={searchPromises} searchResults={props.searchResults} />
          <Snackbar
            open={snackbarOptions.open}
            autoHideDuration={5000}
            onClose={handleSnackbarClose}
          >
            <Alert onClose={handleSnackbarClose} severity="warning" sx={{ width: '100%' }}>
              {snackbarOptions.message}
            </Alert>
          </Snackbar>

          {props.searchResults?.output?.features?.length > 0 && <SearchResultsComponent searchResults={props.searchResults.output} setFootprintFeatures={props.setFootprintFeatures} footprintFeatures={props.footprintFeatures} mapRef={props.mapRef} />}
        </div>
      </div>
    </>
  )
}

export default React.memo(ControlPanel)
