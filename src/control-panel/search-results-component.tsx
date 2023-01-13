// Component for presenting search results on a mui-x datagrid

import * as React from 'react';
import {Tooltip, Typography, GlobalStyles} from '@mui/material';
import { DataGrid, GridColumnMenu, GridToolbarContainer, GridToolbarFilterButton, GridToolbarColumnsButton } from '@mui/x-data-grid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCloudSun, faSquarePollHorizontal, faSatellite, faBolt, faVectorSquare, faDrawPolygon
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

function check_unknown(x, suffix) {
  return (x || x === 0) ? `${Math.round(x)}${suffix}` : '-'
}

const datagridColumns = [
  { 
    field: 'acquisitionDate', 
    valueGetter: (params) => params.row.acquisitionDate.substring(0, 16).replace('T', ' '),
    renderCell: (params) => {
      const dateStr = params.value
      return (<Tooltip title={dateStr}><p>{dateStr.substring(0, 10)}</p></Tooltip>) 
    },
    width: 90, // 120 to see datetime, 100 to see only date
    type: 'dateTime',
    description: 'Acquisition Date',
    renderHeader: () => (<strong>Date</strong>),
  },
  { 
    field: 'resolution', 
    valueGetter: (params) => `${params.row?.resolution || '?'}m`,
    description: 'Resolution (m/px)',
    width: 60,
    renderHeader: () => (
    <Tooltip title={'Resolution (m/px)'}>
      <strong>GSD</strong>
    </Tooltip>
    ),
  },
  { 
    field: 'price', 
    width: 80,
    valueGetter: (params) => check_unknown(params.row?.price, ' $'), // USD EURO
    renderHeader: () => (<strong>Price</strong>),
  },
  // { 
  //   field: 'constellation', 
  //   width: 95,// 95,
  //   renderHeader: () => (<strong>Constellation</strong>),
  //   renderCell: (params) => {
  //     return (<Tooltip title={params.value}><p>{params.value}</p></Tooltip>) 
  //   },
  // },
  { 
    field: 'provider',
    width: 160,
    valueGetter: (params) => params.row?.provider,
    renderHeader: () => (<strong>Provider</strong>),
    renderCell: (params) => {
      return (<Tooltip title={params.value}><p>{params.value}</p></Tooltip>) 
    },
  },
  { 
    field: 'cloudCoverage', 
    valueGetter: (params) => check_unknown(params.row?.cloudCoverage, '%'),
    description: 'Cloud Coverage',
    width: 55,
    renderHeader: () => (
      <Tooltip title={'Cloud Coverage'}> 
        <strong>{' '}
        <FontAwesomeIcon icon={faCloudSun} />
        {' '}</strong>
      </Tooltip> 
    ),
  },
  { 
    field: 'shapeIntersection',
    width: 55,
    valueGetter: (params) => check_unknown(params.row?.shapeIntersection, '%'), 
    renderHeader: () => (
      <Tooltip title={'Shape Intersection'}> 
        <strong>{' '}
        <FontAwesomeIcon icon={faVectorSquare} />
        {' '}</strong>
      </Tooltip> 
    ),
  },
  // Provider properties are probably dependent on the provider, airbus in the ase of the below props
  { 
    field: 'Azimuth', 
    valueGetter: (params) => check_unknown(params.row?.providerProperties?.azimuthAngle, '°'),
    renderHeader: () => (
      <Tooltip title={'Azimuth'}>
      <strong> <FontAwesomeIcon icon={faSatellite} /> </strong>
      </Tooltip> 
    ),
    width: 55,
    description: 'Azimuth',
    hide: false,
  },
  { 
    field: 'Sun Azimuth', 
    valueGetter: (params) => check_unknown(params.row?.providerProperties?.illuminationAzimuthAngle, '°'),
    renderHeader: () => (
      <Tooltip title={'Sun Azimuth'}>
      <strong> <FontAwesomeIcon icon={faBolt} /> </strong>
      </Tooltip> 
    ),
    width: 55,
    description: 'Sun Azimuth',
    hide: false,
  },
  { 
    field: 'Sun Elevation', 
    valueGetter: (params) => check_unknown(params.row?.providerProperties?.illuminationElevationAngle, '°'),
    hide: true
  },
  { 
    field: 'Incidence', 
    valueGetter: (params) => check_unknown(params.row?.providerProperties?.incidenceAngle, '°'),
    hide: true
  },
]

const handleRowHover = (e, searchResults, setFootprintFeatures) => {
  const rowId = e.target.parentElement.dataset.id;
  const row = searchResults['features'].find(
    (el) => el.properties.id === rowId
  );
  // setFootprintFeatures(row?.geometry)
  setFootprintFeatures(row)
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
        &nbsp; Search Results  
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
                  onMouseLeave: e => props.setFootprintFeatures({
                    coordinates: [], 
                    type: 'Polygon'
                  }) 
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