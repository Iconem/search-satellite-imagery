import * as React from 'react'

import { Box, Button, CircularProgress } from '@mui/material'
import area from '@turf/area'
import { v4 as uuidv4 } from 'uuid'
import { shapeIntersection, Providers, filterFeaturesWithSearchParams } from '../archive-apis/search-utilities'
import PropTypes from 'prop-types'

// import {searchUp42, searchEosHighres, searchSkywatch, searchMaxar} from './search-apis'
import searchUp42 from '../archive-apis/search-up42'
import searchMaxar from '../archive-apis/search-maxar'
import { searchEosHighres } from '../archive-apis/search-eos'
import searchSkywatch from '../archive-apis/search-skywatch'
import searchSkyfi from '../archive-apis/search-skyfi'
import searchOpenaerialmap from '../archive-apis/search-openaerialmap'
import searchArlula from '../archive-apis/search-arlula'
import searchApollo from '../archive-apis/search-apollo'

import { GSD_STEPS, GSDFromIndex, log } from '../utilities'

import searchStac from '../archive-apis/search-stac'

const productionMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'production'

/* Search Button */
SearchButton.propTypes = {
  polygons: PropTypes.any,
  searchSettings: PropTypes.any,
  apiKeys: PropTypes.any,
  setters: PropTypes.any,
  providersTreeviewDataSelection: PropTypes.any,
  loadingResults: PropTypes.bool,
  theme: PropTypes.any,
}
function SearchButton(props): React.ReactElement {
  const handleLoadingButtonClick = async (): void => {
    log('SearchButton props.providersTreeviewDataSelection', props.providersTreeviewDataSelection)
    // if (!props.loadingResults) {
    // props.searchImagery()
    // }
    await searchImagery(props.polygons, props.searchSettings, props.apiKeys, props.setters, props.providersTreeviewDataSelection)
  }
  const buttonDisabled = props.loadingResults || (productionMode && !(props.polygons?.length > 0))
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ m: 1, position: 'relative', width: '100%' }}>
        <Button variant="contained" sx={{ width: '100%' }} disabled={buttonDisabled} onClick={handleLoadingButtonClick}>
          SEARCH
        </Button>
        {props.loadingResults && (
          <CircularProgress
            size={24}
            sx={{
              color: props.theme.palette.primary.main,
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
  )
}

// -----------------------------------
//     SEARCH API LOGIC
// -----------------------------------

const providersSearch = {
  [Providers.UP42]: searchUp42,
  [Providers.MAXAR_DIGITALGLOBE]: searchMaxar,
  [Providers.EOS]: searchEosHighres,
  [Providers.SKYWATCH]: searchSkywatch,
  [Providers.SKYFI]: searchSkyfi,
  [Providers.OAM]: searchOpenaerialmap,
  [Providers.ARLULA]: searchArlula,
  [Providers.APOLLO]: searchApollo,

  [Providers.STAC]: searchStac,
}

const emptyFeatureCollection = {
  features: [],
  type: 'FeatureCollection',
}
const hideSearchDelay = 10000
const searchImagery = async (polygons, searchSettings, apiKeys, setters, providersTreeviewDataSelection): Promise<any> => {
  setters.setLoadingResults(true)
  const searchResultsOutput = JSON.parse(JSON.stringify(emptyFeatureCollection)) // Deep Copy

  // ONLY TAKE FIRST POLYGON, flat does not work with up42 search, it considers next polygons as holes rather than union
  let coordinates: any = null
  if (polygons?.length) {
    if (polygons.length === 1) {
      coordinates = polygons.map((p) => p.geometry.coordinates)[0] // .flat()
    } else if (polygons.length >= 1) {
      console.log('\n\nCAUTION, USE A SINGLE POLYGON\n\n')
      setters.setSnackbarOptions({
        open: true,
        message: 'More than 1 Polygon found, either delete the unwanted AOIs or start over!',
      })
      setters.setLoadingResults(false)
      return { output: emptyFeatureCollection }
    }
  } else {
    if (productionMode) {
      // production code
      setters.setLoadingResults(false)
      setters.setSnackbarOptions({
        open: true,
        message: 'WARNING ! No rectangle AOI polygon has been drawn !',
      })
      return { output: emptyFeatureCollection }
    } else {
      // dev code
      console.log('\n\nCAUTION, USING DEFAULT COORDINATES FOR TESTING ONLY\n\n')
      coordinates = [
        [
          [2.3155246324913605, 48.882101638838435],
          [2.3730642712838232, 48.882101638838435],
          [2.3730642712838232, 48.831624620496],
          [2.3155246324913605, 48.831624620496],
          [2.3155246324913605, 48.882101638838435],
        ],
      ]
      setters.setSnackbarOptions({
        open: true,
        message: 'WARNING ! Default Polygon (Paris area) used since no rectangle polygon has been drawn !',
      })
      // return {output: emptyFeatureCollection}
    }
  }

  const searchPolygon = {
    geometry: { coordinates, type: 'Polygon' },
    type: 'Feature',
    properties: {
      ...searchSettings,
      id: uuidv4(),
      // gsdIndex,
      acquisitionDate: searchSettings.startDate,
      gsd_min: GSD_STEPS[searchSettings.gsdIndex[0]],
      gsd_max: GSD_STEPS[searchSettings.gsdIndex[1]],
      constellation: 'SEARCH_INPUT_PARAMS',
      provider: 'SEARCH_INPUT_PARAMS',
      providerPlatform: 'SEARCH_INPUT_PARAMS',
      sensor: 'SEARCH_INPUT_PARAMS',
      price: 0,
      resolution: 0,
      shapeIntersection: 100,

      // Styles for geojson.io or qgis fill data-driven-override
      fill: '#f00',
      'fill-opacity': 0.3,
      'stroke-width': 1,
    },
  }
  const searchResults = {
    input: searchPolygon,
    output: searchResultsOutput,
  }
  setters.setSearchResults(searchResults)

  // console.log('Search Settings', polygons, '\n Coordinates', coordinates, searchPolygon)
  // const search_polygon = polygons && polygons.length && (polygons.length > 0) && polygons[0]

  if (area(searchPolygon as any) / 1_000_000 > 100_000) {
    setters.setSnackbarOptions({
      open: true,
      message: 'Polygon-0 AOI Area > 100.000 km2',
    })
  }

  const searchSettingsObj = {
    coordinates,
    // startDate, endDate,
    ...searchSettings,
    // gsdIndex,
    gsd: {
      min: GSD_STEPS[searchSettings.gsdIndex[0]],
      max: GSD_STEPS[searchSettings.gsdIndex[1]],
    },
  }
  console.log(`SEARCH PARAMETERS: \n`, 'searchSettingsObj:', searchSettingsObj, '\n', `GSD: ${searchSettingsObj.gsdIndex.map(GSDFromIndex) as string}\n`)

  function updateSearchResults(newResults): void {
    if (newResults) {
      // console.log('length before push', searchResults.output.features.length)
      // The below two lines commented out wont work because no change in shallow equality check
      // searchResults.output.features.push(...newResults.features)
      // setters.setSearchResults(searchResults)
      setters.setSearchResults({
        input: searchResults.input, // either ...searchResults, or input: searchResults.input, or simply
        output: {
          type: 'FeatureCollection',
          features: [...searchResults.output.features, ...newResults.features],
        },
      })
      searchResults.output.features.push(...newResults.features)
      // console.log('length after push', searchResults.output.features.length)
    }
  }
  // updateSearchResults(searchPolygon)

  // Filter only selected search APIs
  const filteredProvidersSearch = providersTreeviewDataSelection ? Object.fromEntries(Object.entries(providersSearch).filter(([key]) => providersTreeviewDataSelection.some((treeId) => treeId.includes(key)))) : providersSearch
  // console.log('before/after filteredProvidersSearch', providersSearch, filteredProvidersSearch)

  // PROMISES FOR EACH SEARCH API
  const searchPromises = Object.fromEntries(
    // build a dict from a dict via an array of key-value pairs
    Object.keys(filteredProvidersSearch).map((provider) => {
      return [
        provider,
        {
          provider,
          searchFinished: false,
          searchFinishedForMoreThanDelay: false,
          errorOnFetch: false,
          promise: new Promise(async (resolve) => {
            let searchResultsJson, errorOnFetch
            // const { searchResultsJson, errorOnFetch } = await filteredProvidersSearch[provider]
            //   (searchSettingsObj, apiKeys[provider], searchPolygon, setters)
            await filteredProvidersSearch[provider](searchSettingsObj, apiKeys[provider], searchPolygon, setters)
              .then((searchResultObj) => {
                if (!searchResultObj || searchResultObj.errorOnFetch || !searchResultObj.searchResultsJson) {
                  throw new Error('Search had an error or led to not well formatted search_results object')
                }
                ;({ searchResultsJson, errorOnFetch } = searchResultObj)
                searchPromises[provider].errorOnFetch = errorOnFetch ?? false

                // Compute AOI shape intersection / coverage percent
                searchResultsJson.features
                  .filter((f) => !f.properties.shapeIntersection)
                  .forEach((f) => {
                    // console.log('recompute shapeIntersection for ', f)
                    f.properties.shapeIntersection = shapeIntersection(f.geometry, searchPolygon)
                    // console.log('f.properties.shapeIntersection', f.properties.shapeIntersection,  searchPolygon.properties.shapeIntersection,  (f.properties.shapeIntersection ?? 100) >= searchPolygon.properties.shapeIntersection)
                  })

                // Filter out results not matching resquest
                searchResultsJson.features = searchResultsJson.features.filter((f) => filterFeaturesWithSearchParams(f, searchPolygon))
              })
              .catch((error) => {
                console.error('Error during search', error)
                searchPromises[provider].errorOnFetch = true
                // TODO: could use notistack provider to handle multiple snackbar messages at once
                setters.setSnackbarOptions({
                  open: true,
                  message: `Failure during search with ${provider}, request resulted in error - requires Allow-CORS plugin, cors-proxy or requestly to edit header origin, host or referer`,
                })
                searchResultsJson = {
                  features: [],
                  type: 'FeatureCollection',
                }
              })

            // Once search promise await ok, resolve promise, modify state, and edit timeout
            updateSearchResults(searchResultsJson)
            resolve(searchResultsJson)
            searchPromises[provider].searchFinished = true
            // setters.setSearchPromises(searchPromises)
            setters.setSearchPromises({
              ...searchPromises,
              [provider]: {
                ...searchPromises[provider],
                searchFinished: true,
              },
            })

            setTimeout(() => {
              searchPromises[provider].searchFinishedForMoreThanDelay = true
              // setters.setSearchPromises(searchPromises)
              setters.setSearchPromises({
                ...searchPromises,
                [provider]: {
                  ...searchPromises[provider],
                  searchFinishedForMoreThanDelay: true,
                },
              })
            }, hideSearchDelay)
          }),
        },
      ]
    })
  )
  setters.setSearchPromises(searchPromises)
  log('Search API Requests Promises', searchPromises)
  await Promise.all(Object.values(searchPromises).map(async (o) => await o.promise)).then((results) => {
    setters.setLoadingResults(false)
    setters.setSettingsCollapsed(true)
    console.log('FINISHED requests for all Providers promises!', results)
  })
}

// function SearchButtonComponent(props) {

//     return (
//       <SearchButton
//         loadingResults={loadingResults}
//         setSearchResults= {props.setSearchResults}
//         polygons= {polygons}
//         searchImagery={() =>
//           searchImagery(polygons, searchSettings, apiKeys, setters)
//         }
//       />
//     )
// }

export default SearchButton
