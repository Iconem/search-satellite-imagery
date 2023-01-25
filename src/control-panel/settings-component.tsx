// Settings Component with sliders for GSD and Cloudiness
// + in a collapsable section, AOI coverage, Sun Elevation and Off Nadir angles setup

import * as React from 'react';
import {Slider, Typography, Collapse, Box} from '@mui/material';
import { styled } from '@mui/system';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCloudSun, faChevronDown, faChevronUp, faCropSimple, 
  faGear, faTableCellsLarge, 
} from '@fortawesome/free-solid-svg-icons'

/* Factorization Component of settings header and default slider properties */
import SettingsHeader from './settings-header' 
import {SatelliteImagerySourcesTreeview} from "./satellite-imagery-sources-treeview";
import {useLocalStorage} from '../utilities';

// Default to small mui slider with 0-100 range and step 1
const defaultSliderProps = {
  min: 0, max: 100, step: 1,
  size: 'small', 'valueLabelDisplay': 'auto'
}
const appendSuffix = suffix => val => `${val}${suffix}`
const marks_10_100 = [...Array(11).keys()].map(i => `${i*10}%`);

const handleSliderFun = (state_property, props) => (event: Event, newValue: number | number[]) =>
  props.setSearchSettings({
    ...props.searchSettings, 
    [state_property]: newValue
  })

// Correctly center marks at each end of slider
const CustomMarksSlider = styled(Slider)({
  '& .MuiSlider-markLabel[data-index="0"]': {
    transform: "translateX(-10%)"
  },
  '& .MuiSlider-markLabel[data-index="3"]': {
    transform: "translateX(-100%)"
  }, 
  // '& .MuiSlider-markLabel': {
  //   fontSize: "10px",
  //   top: "25px"
  // }, 
  // '& .MuiSlider-thumb': {
  //   width: "8px",
  //   height: "8px"
  // }, 
});

// ---
// Each following component is a settings component */
// ---

function GSDComponent(props) {
  const GSD_steps = props.GSD_steps
  function GSDFromIndex(gsd_index: number) {
    const gsdMeters = GSD_steps[gsd_index];
    return (gsdMeters < 1)? `${Math.floor(gsdMeters*100)}cm` : `${gsdMeters}m`;
  }

  const marks_GSD = [0, 3, 6, 8].map((i) => ({
    value: i, 
    label: GSDFromIndex(i)
  })); 

  return (
    <>
      <SettingsHeader 
        icon={faTableCellsLarge} 
        title={'GSD Resolution'}
        value={GSDFromIndex(props.searchSettings.gsdIndex[1])} />
        <div style={{marginLeft: '7px', marginRight: '7px'}}>
          <CustomMarksSlider
            {...defaultSliderProps as any}
            min={0} max={GSD_steps.length - 1}
            marks={marks_GSD}
            value={props.searchSettings.gsdIndex}
            valueLabelFormat={GSDFromIndex}
            onChange={handleSliderFun('gsdIndex', props)}
          />
        </div>
        <Box sx={{ m: 1, p:2 }} />
    </>
  );
}

/* Cloudiness Component */
function CloudinessComponent(props) {
  // const handleCloudCoverageSlider = (event: Event, newValue: number | number[]) =>
  //   props.setSearchSettings({
  //     ...props.searchSettings, 
  //     cloudCoverage: newValue
  //   })
  return (
    <>
      <SettingsHeader 
        icon={faCloudSun} 
        title={'Cloudiness'}
        value={`≤ ${props.searchSettings.cloudCoverage} %` } />
        <div style={{marginLeft: '7px', marginRight: '7px'}}>
          <Slider
            {...defaultSliderProps as any}
            value={props.searchSettings.cloudCoverage}
            // onChange={handleCloudCoverageSlider}
            // onChange={props.handleSlider('cloudCoverage')}
            onChange={handleSliderFun('cloudCoverage', props)}
            valueLabelFormat={value => `${value}%`}
          />
        </div>
    </>
  );
}

/* ADVANCED SETTINGS COMPONENT */
function AoiCoverageComponent(props) {
  return (
    <>
      <SettingsHeader 
        icon={faCropSimple} 
        title={'AOI Coverage'}
        value={`≥ ${props.searchSettings.aoiCoverage}%` } />
        <div style={{marginLeft: '7px', marginRight: '7px'}}>
          <Slider
          {...defaultSliderProps as any}
          value={props.searchSettings.aoiCoverage}
          // onChange={props.handleSlider('aoiCoverage')}
          onChange={handleSliderFun('aoiCoverage', props)}
          track="inverted"
          valueLabelFormat={appendSuffix('%')}
        />
      </div> 
    </>
  );
}
function SunElevationComponent(props) {
  return (
    <>
      <SettingsHeader 
        title={'Sun Elevation'}
        value={`${props.searchSettings.sunElevation[0]}° ≤ x ≤ ${props.searchSettings.sunElevation[1]}°` } />
        <div style={{marginLeft: '7px', marginRight: '7px'}}>
          <Slider
            {...defaultSliderProps as any}
            min={0}
            max={90}
            value={props.searchSettings.sunElevation}
            onChange={handleSliderFun('sunElevation', props)}
            valueLabelFormat={appendSuffix('°')}
          /> 
        </div>
    </>
  );
}
function OffNadirComponent(props) {
  return (
    <>
      <SettingsHeader 
        title={'Off Nadir Angle'}
        value={`${props.searchSettings.offNadirAngle[0]}° ≤ x ≤ ${props.searchSettings.offNadirAngle[1]}°` } />
        <div style={{marginLeft: '7px', marginRight: '7px'}}>
          <Slider
            {...defaultSliderProps as any}
            min={-60}
            max={60}
            value={props.searchSettings.offNadirAngle}
            onChange={handleSliderFun('offNadirAngle', props)}
            valueLabelFormat={appendSuffix('°')}
          /> 
        </div>
    </>
  );
}

function AdvancedSettingsComponent(props) {
  // const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = React.useState(true) 
  const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = useLocalStorage('advancedSettingsCollapsed', true)
  return (
    <>
      <Typography 
        variant="subtitle2" 
        onClick={() => setAdvancedSettingsCollapsed(!advancedSettingsCollapsed)} 
        sx={{cursor: 'pointer', zIndex: 10}}
      >
        <FontAwesomeIcon icon={faGear} /> 
        &nbsp; Advanced &nbsp; 
        {
          advancedSettingsCollapsed ? 
          <FontAwesomeIcon icon={faChevronDown} /> : 
          <FontAwesomeIcon icon={faChevronUp} />
        }
      </Typography>
      <Collapse in={!advancedSettingsCollapsed} timeout="auto" unmountOnExit>
        <AoiCoverageComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
        <SunElevationComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
        <OffNadirComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
      </Collapse>
    </>
  );
}

function SettingsComponent(props) {
  return (
    <>
      <GSDComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} GSD_steps={props.GSD_steps} />
      <CloudinessComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings}  />

      <AdvancedSettingsComponent 
        searchSettings={props.searchSettings}  setSearchSettings={props.setSearchSettings}
      />

      <SatelliteImagerySourcesTreeview 
          setProvidersTreeviewDataSelection={props.setProvidersTreeviewDataSelection} 
          providersTreeviewDataSelection={props.providersTreeviewDataSelection} 
      />
    </>
  );
}

export default React.memo(SettingsComponent);