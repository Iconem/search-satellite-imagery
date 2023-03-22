// Component for presenting search results on a mui-x datagrid

import * as React from 'react'
import { Tooltip, Typography, GlobalStyles, Box } from '@mui/material'
import { DataGrid, GridToolbarContainer, GridToolbarFilterButton, GridToolbarColumnsButton, GridToolbarDensitySelector, type GridRowHeightParams, type GridColDef, GridFooterContainer, GridPagination, gridPageCountSelector, useGridApiContext, useGridSelector, GridAutoSizer } from '@mui/x-data-grid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudSun, faSquarePollHorizontal, faSatellite, faBolt, faVectorSquare } from '@fortawesome/free-solid-svg-icons'
import bbox from '@turf/bbox'

import MuiPagination from '@mui/material/Pagination'
import { type TablePaginationProps } from '@mui/material/TablePagination'

/* SEARCH RESULTS COMPONENT */
function CustomGridToolbar(): React.ReactElement {
  return (
    <GridToolbarContainer
      sx={{
        '& .MuiButton-root': {
          // color: 'black',
          fontSize: 'small',
          fontWeight: 300,
          textTransform: 'none',
        },
      }}
    >
      <GridToolbarFilterButton />
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  )
}

function CustomFooter(): React.ReactElement {
  return (
    <GridFooterContainer>
      {/* <GridPagination /> */}
      {/* <GridAutoSizer /> */}
      <CustomPagination />
    </GridFooterContainer>
  )
}

function Pagination({ page, onPageChange, className }: Pick<TablePaginationProps, 'page' | 'onPageChange' | 'className'>): React.ReactElement {
  const apiRef = useGridApiContext()
  const pageCount = useGridSelector(apiRef, gridPageCountSelector)

  return (
    // <></>
    <MuiPagination
      color="primary"
      className={className}
      count={pageCount}
      page={page + 1}
      onChange={(event, newPage) => {
        onPageChange(event as any, newPage - 1)
      }}
    />
  )
}

function CustomPagination(props: any): React.ReactElement {
  return <GridPagination ActionsComponent={Pagination} {...props} />
}

// function CustomColumnMenuComponent(props: any): React.ReactElement {
//   const { hideMenu, currentColumn, color, ...other } = props

//   return <GridColumnMenu hideMenu={hideMenu} currentColumn={currentColumn} ownerState={{ color }} {...other} />
// }

function checkUnknown(x: number, suffix: string): string {
  return x || x === 0 ? `${Math.round(x)}${suffix}` : '-'
}

// const NO_IMAGE_FALLBACK_URL = 'https://via.placeholder.com/300x300.webp/FFFFFF/000000?text=No+Preview+Available' // './no_image_fallback.jpg'

const datagridColumns: GridColDef[] = [
  {
    field: 'acquisitionDate',
    // valueGetter: (params) => params.row.acquisitionDate.substring(0, 16).replace('T', ' '),
    valueGetter: (params) => new Date(params.row.acquisitionDate),
    renderCell: (params) => {
      const dateStr = params.value
      return (
        <Tooltip title={dateStr.toISOString().substring(0, 16).replace('T', ' ')} disableInteractive>
          <p>{dateStr.toISOString().substring(0, 10)}</p>
        </Tooltip>
      )
    },
    width: 90, // 120 to see datetime, 100 to see only date
    type: 'dateTime',
    description: 'Acquisition Date',
    renderHeader: () => <strong>Date</strong>,
  },
  {
    field: 'resolution',
    type: 'number',
    valueGetter: (params) => parseFloat(params.row?.resolution),
    description: 'Resolution (m/px)',
    width: 60,
    renderCell: (params) => {
      return <p>{`${Math.floor(params.value * 100) / 100 || '?'}m`}</p>
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
      return <p>{`${checkUnknown(params.value, ' $')}`}</p> // USD EURO
    },
    renderHeader: () => <strong>Price</strong>,
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
    minWidth: 160,
    flex: 1,
    // valueGetter: (params) => params.row?.provider,
    renderHeader: () => <strong>Provider</strong>,
    renderCell: (params) => {
      return (
        <Tooltip title={params.value} disableInteractive>
          <p>{params.value}</p>
        </Tooltip>
      )
    },
  },
  {
    field: 'cloudCoverage',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '%')}`}</p>
    },
    valueGetter: (params) => params.row?.cloudCoverage,
    description: 'Cloud Coverage',
    width: 55,
    renderHeader: () => (
      <Tooltip title={'Cloud Coverage'}>
        <strong>
          {' '}
          <FontAwesomeIcon icon={faCloudSun} />{' '}
        </strong>
      </Tooltip>
    ),
  },
  {
    field: 'shapeIntersection',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '%')}`}</p>
    },
    width: 55,
    valueGetter: (params) => params.row?.shapeIntersection,
    renderHeader: () => (
      <Tooltip title={'Shape Intersection'}>
        <strong>
          {' '}
          <FontAwesomeIcon icon={faVectorSquare} />{' '}
        </strong>
      </Tooltip>
    ),
  },
  // Provider properties are probably dependent on the provider, airbus in the ase of the below props
  {
    field: 'Azimuth',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '°')}`}</p>
    },
    valueGetter: (params) => params.row?.providerProperties?.azimuthAngle,
    renderHeader: () => (
      <Tooltip title={'Azimuth'}>
        <strong>
          {' '}
          <FontAwesomeIcon icon={faSatellite} />{' '}
        </strong>
      </Tooltip>
    ),
    width: 55,
    description: 'Azimuth',
  },
  {
    field: 'Sun Azimuth',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '°')}`}</p>
    },
    valueGetter: (params) => params.row?.providerProperties?.illuminationAzimuthAngle,
    renderHeader: () => (
      <Tooltip title={'Sun Azimuth'}>
        <strong>
          {' '}
          <FontAwesomeIcon icon={faBolt} />{' '}
        </strong>
      </Tooltip>
    ),
    width: 55,
    description: 'Sun Azimuth',
  },
  {
    field: 'Sun Elevation',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '°')}`}</p>
    },
    valueGetter: (params) => params.row?.providerProperties?.illuminationElevationAngle,
  },
  {
    field: 'Incidence',
    type: 'number',
    renderCell: (params) => {
      return <p>{`${checkUnknown(params.value, '°')}`}</p>
    },
    valueGetter: (params) => params.row?.providerProperties?.incidenceAngle,
  },
  {
    field: 'thumbnail',
    type: 'string',
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
  },
  {
    field: 'preview',
    type: 'string',
    renderCell: (params) => (
      <img
        src={params.value}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        // onError={e => {
        //    // or e.target.className = fallback_className
        //   (e.target as any).src = NO_IMAGE_FALLBACK_URL;
        // }}
        title={'No Preview available'}
      />
    ),
    valueGetter: (params) => params.row?.preview_uri, // thumbnail_uri or preview_uri
    // resizable: true, // only works for datagrids with mui-x pro
    // width is not dynamic yet https://github.com/mui/mui-x/issues/1241
    minWidth: 200,
    flex: 1,
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
      return (
        <Tooltip title={params.value}>
          <p>{params.value}</p>
        </Tooltip>
      )
    },
    valueGetter: (params) => params.row?.id,
    renderHeader: () => (
      <Tooltip title={'Identifier of scene/image/product on the corresponding platform provider'} disableInteractive>
        <strong> Identifier </strong>
      </Tooltip>
    ),
  },
]

// displays id ok for up42 (properties.id), head (r.identifier), maxar (f.attributes.image_identifier), skywatch (r.product_name) and eos (r.sceneID)
const getRowIdFromProps = (properties): string => `${properties.provider as string}/${properties.id as string}`
const handleRowHover = (e, searchResults, setFootprintFeatures): void => {
  const rowId = e.target.parentElement.dataset.id // provider/id
  const row = searchResults.features.find((el) => getRowIdFromProps(el.properties) === rowId)
  // setFootprintFeatures(row?.geometry)
  setFootprintFeatures(row)
}

const handleRowClick = (
  params, // GridRowParams
  event, // MuiEvent<React.MouseEvent<HTMLElement>>
  details, // GridCallbackDetails
  mapRef,
  searchResults
): void => {
  const featureGeom = searchResults.features.find((el) => getRowIdFromProps(el.properties) === params.id)
  console.log('rowClick params', params, featureGeom)
  const bounds = bbox(featureGeom)
  const [minLng, minLat, maxLng, maxLat] = bounds
  mapRef?.current?.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      bearing: 0,
      center: [0.5 * (minLng + maxLng), 0.5 * (minLat + maxLat)],
    }
  )
}

function SearchResultsComponent(props): React.ReactElement {
  const searchResults = props.searchResults
  const [autoPageSizeBool, setAutoPageSizeBool] = React.useState(false)

  const rows = searchResults.features.map((feature) => feature.properties)
  return (
    <>
      <Typography variant="subtitle1">
        <FontAwesomeIcon icon={faSquarePollHorizontal} />
        &nbsp; Search Results
      </Typography>

      {/* height: 600, */}
      <div style={{ width: '100%', flex: '1 1 auto', minHeight: '320px', overflow: 'auto' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flexGrow: 1 }}>
            <GlobalStyles
              styles={{
                '& .MuiDataGrid-panelWrapper': {
                  padding: '10px', // padding of toolbar styles
                },
              }}
            />
            <DataGrid
              onPaginationModelChange={(newModel, reason) => {
                if (newModel.pageSize === 0) {
                  setAutoPageSizeBool(true)
                } else {
                  setAutoPageSizeBool(false)
                }
              }}
              selectionModel={[props.footprintFeatures?.properties?.id || null]}
              // Fired when selction changed from datagrid
              // onSelectionModelChange={(newSelectionModel) => {
              //   console.log('newSelectionModel', newSelectionModel)
              //   const rowId = newSelectionModel[0]
              //   console.log('rowId', rowId)
              //   const row = searchResults['features'].find(
              //     (el) => el.properties.id === rowId
              //   );
              //   // setFootprintFeatures(row?.geometry)
              //   // props.setFootprintFeatures(row)

              //   if (rowId) {
              //     handleRowClick ({id: rowId}, null, null, props.mapRef, searchResults)
              //   }
              // }}
              getRowId={(row: any) => getRowIdFromProps(row)}
              density="compact"
              sortingOrder={['desc', 'asc']}
              // autoHeight
              components={{
                Toolbar: CustomGridToolbar,
                Footer: CustomFooter,
                // ColumnMenu: CustomColumnMenuComponent,
              }}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'acquisitionDate', sort: 'desc' }],
                },
                columns: {
                  columnVisibilityModel: {
                    thumbnail: false,
                    Incidence: false,
                    'Sun Elevation': false,
                  },
                },
                // detailPanel: { expandedRowIds: [1, 2, 3] }
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              // PAGESIZE TODO
              // autoPageSize={true}
              autoPageSize={autoPageSizeBool}
              // slots={{
              //   pagination: CustomPagination,
              // }}
              pageSizeOptions={[0, 25, 100]} // cannot exceed 100 in open-source datagrid version
              // If wanted to show image only in expanded detailed view
              // getDetailPanelContent={({ row }) => <div>Row ID: {row.id}</div>}
              checkboxSelection={false}
              getRowHeight={({ id, densityFactor }: GridRowHeightParams) => {
                switch (densityFactor) {
                  case 0.7:
                    return null
                  case 1:
                    return 100
                  case 1.3:
                    return 200
                }
                // return 100 * densityFactor; // 70/100/130
                // return null;
              }}
              disableColumnMenu={true}
              hideFooterSelectedRowCount={true}
              rowsPerPageOptions={[]}
              columns={datagridColumns}
              rows={rows}
              onRowClick={(p, e, d) => {
                handleRowClick(p, e, d, props.mapRef, searchResults)
              }}
              componentsProps={{
                row: {
                  onMouseEnter: (e) => {
                    handleRowHover(e, searchResults, props.setFootprintFeatures)
                  },
                  // onMouseLeave: e => props.setFootprintFeatures({
                  //   coordinates: [],
                  //   type: 'Polygon'
                  // })
                },
                columnMenu: {
                  // background: 'red',
                  counter: rows.length,
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
  )
}

export default React.memo(SearchResultsComponent)
