import * as React from 'react';

import {Box, Button, CircularProgress} from '@mui/material';
import {theme} from '../theme';
import area from '@turf/area';
import { v4 as uuidv4 } from 'uuid';

// import {search_up42, search_eos_highres, search_skywatch, search_head, search_maxar} from './search-apis'
import search_up42 from '../archive-apis/search-up42'
import search_head from '../archive-apis/search-head'
import search_maxar from '../archive-apis/search-maxar'
import search_skywatch from '../archive-apis/search-skywatch'
import search_eos_highres from '../archive-apis/search-eos'
import {Providers} from '../archive-apis/search-utilities'
import { GSD_steps, GSDFromIndex} from '../utilities'



/* Search Button */
function SearchButton(props) {
  const handleLoadingButtonClick = () => {
    console.log('SearchButton props.providersTreeviewDataSelection', props.providersTreeviewDataSelection)
    // if (!props.loadingResults) {
      // props.search_imagery()
    // }
    search_imagery(props.polygons, props.searchSettings, props.apiKeys, props.setters, props.providersTreeviewDataSelection)
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ m: 1, position: 'relative', width: '100%' }}>
        
          <Button
            variant="contained"
            sx={{width: '100%'}}
            disabled={props.loadingResults 
              // || !(props.polygons?.length > 0)
            }
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
const search_imagery = async (polygons, searchSettings, apiKeys, setters, providersTreeviewDataSelection) => {
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
      setters.setLoadingResults(false);
      return {output: emptyFeatureCollection}
    }
  } else {
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      // dev code
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
  } else {
      // production code
      setters.setLoadingResults(false);
      return {output: emptyFeatureCollection}
  }
  
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

  console.log('Search Settings', polygons, '\n Coordinates', coordinates, searchPolygon)
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
      // console.log('length before push', searchResults.output.features.length)
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
      // console.log('length after push', searchResults.output.features.length)
    }
  }
  // update_search_results(searchPolygon)

  // Filter only selected search APIs
  const filtered_providers_search = providersTreeviewDataSelection ? 
    Object.fromEntries(
      Object.entries(providers_search)
        .filter(([key]) => providersTreeviewDataSelection.some(treeId => treeId.includes(key)))
    )
    : providers_search;
  console.log('filtered_providers_search', providers_search, filtered_providers_search)

  // PROMISES FOR EACH SEARCH API
  const search_promises = Object.fromEntries( // build a dict from a dict via an array of key-value pairs
    Object.keys(filtered_providers_search).map(
      provider => {
        return [
          provider, 
          {
            provider, 
            searchFinished: false,
            searchFinishedForMoreThanDelay: false,
            promise: new Promise(async resolve => {
              const { search_results_json } = await filtered_providers_search[provider]
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
  console.log('Search API Requests Promises', search_promises)
  Promise.all(Object.values(search_promises).map (o => o.promise))
  .then((results) => {
    setters.setLoadingResults(false);
    setters.setSettingsCollapsed(true)
    console.log('finished requests for all promises', results)
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

export default SearchButton;
