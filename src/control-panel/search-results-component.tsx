// Component for presenting search results on a mui-x datagrid

import * as React from 'react';
import {Tooltip, Typography, GlobalStyles, Box} from '@mui/material';
import { DataGrid, GridColumnMenu, GridToolbarContainer, GridToolbarFilterButton, GridToolbarColumnsButton, GridToolbarDensitySelector, GridRowHeightParams, GridColDef } from '@mui/x-data-grid';
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
      <GridToolbarDensitySelector />
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

const no_image_fallback_url = 'https://via.placeholder.com/300x300.webp/FFFFFF/000000?text=No+Preview+Available'

const datagridColumns: GridColDef[] = [
  { 
    field: 'acquisitionDate', 
    valueGetter: (params) => params.row.acquisitionDate.substring(0, 16).replace('T', ' '),
    renderCell: (params) => {
      const dateStr = params.value
      return (<Tooltip title={dateStr} disableInteractive ><p>{dateStr.substring(0, 10)}</p></Tooltip>) 
    },
    width: 90, // 120 to see datetime, 100 to see only date
    type: 'dateTime',
    description: 'Acquisition Date',
    renderHeader: () => (<strong>Date</strong>),
  },
  { 
    field: 'resolution', 
    type: 'number',
    valueGetter: (params) => parseFloat(params.row?.resolution) ,
    description: 'Resolution (m/px)',
    width: 60,
    renderCell: (params) => {
      return (<p>{`${Math.floor(params.value * 100) / 100 || '?'}m`}</p>) 
    },
    renderHeader: () => (
    <Tooltip title={'Resolution (m/px)'}>
      <strong>GSD</strong>
    </Tooltip>
    ),
  },
  { 
    field: 'price', 
    type: 'number',
    width: 80,
    valueGetter: (params) => parseFloat(params.row?.price),
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, ' $')}`}</p>) // USD EURO
    },
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
    headerName: 'provider',
    width: 160,
    // valueGetter: (params) => params.row?.provider,
    renderHeader: () => (<strong>Provider</strong>),
    renderCell: (params) => {
      return (<Tooltip title={params.value} disableInteractive><p>{params.value}</p></Tooltip>) 
    },
  },
  { 
    field: 'cloudCoverage', 
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '%')}`}</p>) 
    },
    valueGetter: (params) => params.row?.cloudCoverage,
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
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '%')}`}</p>) 
    },
    width: 55,
    valueGetter: (params) => params.row?.shapeIntersection, 
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
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '°')}`}</p>) 
    },
    valueGetter: (params) => params.row?.providerProperties?.azimuthAngle,
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
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '°')}`}</p>) 
    },
    valueGetter: (params) => params.row?.providerProperties?.illuminationAzimuthAngle,
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
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '°')}`}</p>) 
    },
    valueGetter: (params) => params.row?.providerProperties?.illuminationElevationAngle,
    hide: true
  },
  { 
    field: 'Incidence', 
    type: 'number',
    renderCell: (params) => {
      return (<p>{`${check_unknown(params.value, '°')}`}</p>) 
    },
    valueGetter: (params) => params.row?.providerProperties?.incidenceAngle,
    hide: true
  },
  { 
    field: 'thumbnail', 
    type: 'image',
    renderCell: (params) => (
      <Box
        component="img"
        sx={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
        }}
        alt=""
        src={params.value} 
        // onerror={"this.src='alternative.jpg';"}
      />

    ),
    valueGetter: (params) => params.row?.thumbnail_uri, // thumbnail_uri or preview_uri
    hide: true
  },
  {
    field: 'preview', 
    type: 'image',
    renderCell: (params) => (
      <img src={params.value} 
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
         pointerEvents: 'none'
        }} 
        onError={e => {
           // or e.target.className = fallback_className
          (e.target as any).src = no_image_fallback_url;
        }}
      />
    ),
    valueGetter: (params) => params.row?.preview_uri, // thumbnail_uri or preview_uri
    hide: false, 
    // resizable: true, // only works for datagrids with mui-x pro
    // width is not dynamic yet https://github.com/mui/mui-x/issues/1241
    minWidth: 200,
    flex: 1
    // width:({ id, densityFactor }: GridRowHeightParams) => {
    //   switch (densityFactor) {
    //     case 0.7: 
    //       return null;
    //     case 1: 
    //       return 100;
    //     case 1.3: 
    //       return 200;
    //   }
    // }
  },
  { 
    field: 'identifier', 
    minWidth: 100,
    flex: 0.9,
    renderCell: (params) => {
      return (<Tooltip title={params.value}><p>{params.value}</p></Tooltip>) 
    },
    valueGetter: (params) => params.row?.id,
    hide: false,
    renderHeader: () => (
      <Tooltip title={'Identifier of scene/image/product on the corresponding platform provider'}>
      <strong> Identifier </strong>
      </Tooltip> 
    ),

  },
]

// displays id ok for up42 (properties.id), head (r.identifier), maxar (f.attributes.image_identifier), skywatch (r.product_name) and eos (r.sceneID)


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

      {/* height: 600, */}
      <div style={{  width: '100%', flex: '1 1 auto' }}> 
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
              autoPageSize={true}
              // autoHeight
              components={{
                Toolbar: CustomGridToolbar,
                // ColumnMenu: CustomColumnMenuComponent,
              }}
              initialState={{
                sorting: {
                  sortModel: [{ field: "acquisitionDate", sort: "desc" }]
                }, 
                // detailPanel: { expandedRowIds: [1, 2, 3] }
              }}
              // If wanted to show image only in expanded detailed view
              // getDetailPanelContent={({ row }) => <div>Row ID: {row.id}</div>}
              checkboxSelection={false}
              // selectionModel={selectionModel}
              getRowHeight={({ id, densityFactor }: GridRowHeightParams) => {
                switch (densityFactor) {
                  case 0.7: 
                    return null;
                  case 1: 
                    return 100;
                  case 1.3: 
                    return 200;
                }
                // return 100 * densityFactor; // 70/100/130
                // return null;
              }}
              disableColumnMenu={true}
              hideFooterSelectedRowCount={true}
              rowsPerPageOptions={[]}
              columns={datagridColumns}
              rows={ rows }
              componentsProps={{
                row: {
                  onMouseEnter: e => handleRowHover(e, searchResults, props.setFootprintFeatures),
                  // onMouseLeave: e => props.setFootprintFeatures({
                  //   coordinates: [], 
                  //   type: 'Polygon'
                  // }) 
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