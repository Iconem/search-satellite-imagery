// Component for presenting search results on a mui-x datagrid

import * as React from 'react';
import {Tooltip, Typography, GlobalStyles} from '@mui/material';
import { DataGrid, GridColumnMenu, GridToolbarContainer, GridToolbarFilterButton, GridToolbarColumnsButton } from '@mui/x-data-grid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCloudSun, faSquarePollHorizontal, faSatellite, faBolt
} from '@fortawesome/free-solid-svg-icons'


/* SEARCH RESULTS COMPONENT */
function CustomGridToolbar() {
  return (
    <GridToolbarContainer
        sx={ {
          '& .MuiButton-root': {
            color: 'black',
            fontSize: 'small',
            fontWeight: 300,
            textTransform: 'none',
          },
      }}>
      <GridToolbarFilterButton />
      <GridToolbarColumnsButton />
    </GridToolbarContainer>
  );
}

function CustomColumnMenuComponent(props) {
  const { hideMenu, currentColumn, color, ...other } = props;

  return (
    <GridColumnMenu
      hideMenu={hideMenu}
      currentColumn={currentColumn}
      ownerState={{ color }}
      {...other}
    />
  );
}
    
const datagridColumns = [
  { 
    field: 'acquisitionDate', 
    valueGetter: (params) => params.row.acquisitionDate.substring(0, 16).replace('T', ' '),
    renderCell: (params) => {
      const dateStr = params.value
      return (<Tooltip title={dateStr}><p>{dateStr.substring(0, 10)}</p></Tooltip>) 
    },
    width: 100, // 120 to see datetime, 100 to see only date
    type: 'dateTime',
    description: 'Acquisition Date',
    renderHeader: () => (<strong>Date</strong>),
  },
  { 
    field: 'resolution', 
    valueGetter: (params) => `${params.row?.resolution}m`,
    description: 'Resolution (m/px)',
    width: 60,
    renderHeader: () => (
    <Tooltip title={'Resolution (m/px)'}>
      <strong>GSD</strong>
    </Tooltip>
    ),
  },
  { 
    field: 'cloudCoverage', 
    valueGetter: (params) => `${Math.round(params.row?.cloudCoverage)}%`,
    description: 'Cloud Coverage',
    width: 60,
    renderHeader: () => (
      <Tooltip title={'Cloud Coverage'}> 
        <strong>{' '}
        <FontAwesomeIcon icon={faCloudSun} />
        {' '}</strong>
      </Tooltip> 
    ),
  },
  { 
    field: 'constellation', 
    width: 100,
    renderHeader: () => (<strong>Constellation</strong>),
  },
  { 
    field: 'producer',
    width: 70,
    hide: true
  },
  // Provider properties are probably dependent on the provider, airbus in the ase of the below props
  { 
    field: 'Azimuth', 
    valueGetter: (params) => `${Math.round(params.row?.providerProperties?.azimuthAngle)}°`,
    renderHeader: () => (
      <Tooltip title={'Azimuth'}>
      <strong> <FontAwesomeIcon icon={faSatellite} /> </strong>
      </Tooltip> 
    ),
    width: 60,
    description: 'Azimuth',
    hide: false,
  },
  { 
    field: 'Sun Azimuth', 
    valueGetter: (params) => `${Math.round(params.row?.providerProperties?.illuminationAzimuthAngle)}°`,
    renderHeader: () => (
      <Tooltip title={'Sun Azimuth'}>
      <strong> <FontAwesomeIcon icon={faBolt} /> </strong>
      </Tooltip> 
    ),
    width: 60,
    description: 'Sun Azimuth',
    hide: false,
  },
  { 
    field: 'Sun Elevation', 
    valueGetter: (params) => `${Math.round(params.row?.providerProperties?.illuminationElevationAngle)}°`,
    hide: true
  },
  { 
    field: 'Incidence', 
    valueGetter: (params) => `${Math.round(params.row?.providerProperties?.incidenceAngle)}°`,
    hide: true
  },
]

const handleRowHover = (e, searchResults, setFootprintFeatures) => {
  const rowId = e.target.parentElement.dataset.id;
  const row = searchResults['features'].find(
    (el) => el.properties.id === rowId
  );
  setFootprintFeatures(row?.geometry)
};


function SearchResultsComponent(props) {
  const searchResults = props.searchResults
  const rows = searchResults['features'].map(
    feature => feature.properties
  )
  return (
    <>
      <Typography variant="subtitle1" >
        <FontAwesomeIcon icon={faSquarePollHorizontal} /> 
        Search Results  
      </Typography>
      
      <div style={{ height: 600, width: '100%' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flexGrow: 1 }}>
            <GlobalStyles
              styles={{
                  "& .MuiDataGrid-panelWrapper": {
                    padding: "10px" // padding of toolbar styles
                  },
              }}
            />
            <DataGrid
              density="compact"
              autoPageSize
              components={{
                Toolbar: CustomGridToolbar,
                // ColumnMenu: CustomColumnMenuComponent,
              }}
              disableColumnMenu={true}
              hideFooterSelectedRowCount={true}
              rowsPerPageOptions={[]}
              columns={datagridColumns}
              rows={ rows }
              componentsProps={{
                row: {
                  onMouseEnter: e => handleRowHover(e, searchResults, props.setFootprintFeatures),
                  onMouseLeave: e => props.setFootprintFeatures({}) // TODO: [] if want to keep 
                }, 
                columnMenu: { 
                  // background: 'red', 
                  counter: rows.length 
                },
                toolbar: {
                  sx: {
                    '& .MuiButton-root': {
                      color: 'red',
                      fontSize: 30,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(SearchResultsComponent);