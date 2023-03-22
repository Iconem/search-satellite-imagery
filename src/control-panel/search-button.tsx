import * as React from 'react'

import { Box, Button, CircularProgress } from '@mui/material'
import area from '@turf/area'
import { v4 as uuidv4 } from 'uuid'
import { shapeIntersection, Providers, filterFeaturesWithSearchParams } from '../archive-apis/search-utilities'

// import {searchUp42, searchEosHighres, searchSkywatch, searchHead, searchMaxar} from './search-apis'
import searchUp42 from '../archive-apis/search-up42'
import searchHead from '../archive-apis/search-head'
import searchMaxar from '../archive-apis/search-maxar'
import searchEosHighres from '../archive-apis/search-eos'
import searchSkywatch from '../archive-apis/search-skywatch'
import searchSkyfi from '../archive-apis/search-skyfi'
import searchOpenaerialmap from '../archive-apis/search-openaerialmap'
import searchArlula from '../archive-apis/search-arlula'
import searchApollo from '../archive-apis/search-apollo'

import { GSD_STEPS, GSDFromIndex, log } from '../utilities'

import searchStac from '../archive-apis/search-stac'

const productionMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'production'

/* Search Button */
function SearchButton(props) {
  const handleLoadingButtonClick = () => {
    log('SearchButton props.providersTreeviewDataSelection', props.providersTreeviewDataSelection)
    // if (!props.loadingResults) {
    // props.search_imagery()
    // }
    search_imagery(props.polygons, props.searchSettings, props.apiKeys, props.setters, props.providersTreeviewDataSelection)
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

const providers_search = {
  [Providers.UP42]: searchUp42,
  [Providers.HEADAEROSPACE]: searchHead,
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
const search_imagery = async (polygons, searchSettings, apiKeys, setters, providersTreeviewDataSelection): Promise<any> => {
  setters.setLoadingResults(true)
  const searchResultsOutput = JSON.parse(JSON.stringify(emptyFeatureCollection)) // Deep Copy

  // ONLY TAKE FIRST POLYGON, flat does not work with up42 search, it considers next polygons as holes rather than union
  let coordinates = null
  if (polygons?.length) {
    if (polygons.length == 1) {
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
      ;(coordinates = [
        [
          [2.3155246324913605, 48.882101638838435],
          [2.3730642712838232, 48.882101638838435],
          [2.3730642712838232, 48.831624620496],
          [2.3155246324913605, 48.831624620496],
          [2.3155246324913605, 48.882101638838435],
        ],
      ]),
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

  const search_settings = {
    coordinates,
    // startDate, endDate,
    ...searchSettings,
    // gsdIndex,
    gsd: {
      min: GSD_STEPS[searchSettings.gsdIndex[0]],
      max: GSD_STEPS[searchSettings.gsdIndex[1]],
    },
  }
  console.log(`SEARCH PARAMETERS: \n`, 'search_settings:', search_settings, '\n', `GSD: ${search_settings.gsdIndex.map(GSDFromIndex)}\n`)

  function update_search_results(new_results) {
    if (new_results) {
      // console.log('length before push', searchResults.output.features.length)
      // The below two lines commented out wont work because no change in shallow equality check
      // searchResults.output.features.push(...new_results.features)
      // setters.setSearchResults(searchResults)
      setters.setSearchResults({
        input: searchResults.input, // either ...searchResults, or input: searchResults.input, or simply
        output: {
          type: 'FeatureCollection',
          features: [...searchResults.output.features, ...new_results.features],
        },
      })
      searchResults.output.features.push(...new_results.features)
      // console.log('length after push', searchResults.output.features.length)
    }
  }
  // update_search_results(searchPolygon)

  // Filter only selected search APIs
  const filtered_providers_search = providersTreeviewDataSelection ? Object.fromEntries(Object.entries(providers_search).filter(([key]) => providersTreeviewDataSelection.some((treeId) => treeId.includes(key)))) : providers_search
  // console.log('before/after filtered_providers_search', providers_search, filtered_providers_search)

  // PROMISES FOR EACH SEARCH API
  const search_promises = Object.fromEntries(
    // build a dict from a dict via an array of key-value pairs
    Object.keys(filtered_providers_search).map((provider) => {
      return [
        provider,
        {
          provider,
          searchFinished: false,
          searchFinishedForMoreThanDelay: false,
          errorOnFetch: false,
          promise: new Promise(async (resolve) => {
            let searchResultsJson, errorOnFetch
            // const { searchResultsJson, errorOnFetch } = await filtered_providers_search[provider]
            //   (search_settings, apiKeys[provider], searchPolygon, setters)
            await filtered_providers_search[provider](search_settings, apiKeys[provider], searchPolygon, setters)
              .then((search_result_obj) => {
                console.log('a', search_result_obj)
                if (!search_result_obj || search_result_obj.errorOnFetch || !search_result_obj.searchResultsJson) {
                  throw new Error('Search had an error or led to not well formatted search_results object')
                }
                console.log('b')
                ;({ searchResultsJson, errorOnFetch } = search_result_obj)
                search_promises[provider].errorOnFetch = errorOnFetch ?? false

                console.log('c')
                // Compute AOI shape intersection / coverage percent
                searchResultsJson.features
                  .filter((f) => !f.properties.shapeIntersection)
                  .forEach((f) => {
                    // console.log('recompute shapeIntersection for ', f)
                    f.properties.shapeIntersection = shapeIntersection(f.geometry, searchPolygon)
                    // console.log('f.properties.shapeIntersection', f.properties.shapeIntersection,  searchPolygon.properties.shapeIntersection,  (f.properties.shapeIntersection ?? 100) >= searchPolygon.properties.shapeIntersection)
                  })
                console.log('d')

                // Filter out results not matching resquest
                // searchResultsJson.features = searchResultsJson.features.filter(
                //   f => filterFeaturesWithSearchParams(f, searchPolygon)
                // )
              })
              .catch((error) => {
                console.error('Error during search', error)
                search_promises[provider].errorOnFetch = true
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
            update_search_results(searchResultsJson)
            resolve(searchResultsJson)
            search_promises[provider].searchFinished = true
            // setters.setSearchPromises(search_promises)
            setters.setSearchPromises({
              ...search_promises,
              [provider]: {
                ...search_promises[provider],
                searchFinished: true,
              },
            })

            setTimeout(() => {
              search_promises[provider].searchFinishedForMoreThanDelay = true
              // setters.setSearchPromises(search_promises)
              setters.setSearchPromises({
                ...search_promises,
                [provider]: {
                  ...search_promises[provider],
                  searchFinishedForMoreThanDelay: true,
                },
              })
            }, hideSearchDelay)
          }),
        },
      ]
    })
  )
  setters.setSearchPromises(search_promises)
  log('Search API Requests Promises', search_promises)
  Promise.all(Object.values(search_promises).map(async (o) => await o.promise)).then((results) => {
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
//         search_imagery={() =>
//           search_imagery(polygons, searchSettings, apiKeys, setters)
//         }
//       />
//     )
// }

export default SearchButton
