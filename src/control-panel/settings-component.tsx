// Settings Component with sliders for GSD and Cloudiness
// + in a collapsable section, AOI coverage, Sun Elevation and Off Nadir angles setup

import * as React from 'react'
import { Slider, Typography, Collapse, Box } from '@mui/material'
import { styled } from '@mui/system'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudSun, faChevronDown, faChevronUp, faCropSimple, faGear, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'

/* Factorization Component of settings header and default slider properties */
import SettingsHeader from './settings-header'
import { SatelliteImagerySourcesTreeview } from './satellite-imagery-sources-treeview'
import { useLocalStorage } from '../utilities'

// Default to small mui slider with 0-100 range and step 1
const defaultSliderProps = {
  min: 0,
  max: 100,
  step: 1,
  size: 'small',
  valueLabelDisplay: 'auto',
}
const appendSuffix = (suffix: string) => (val: string) => `${val}${suffix}`
// const marks_10_100 = [...Array(11).keys()].map((i) => `${i * 10}%`)

const handleSliderFun = (stateProperty, props) => (event: Event, newValue: number | number[]) =>
  props.setSearchSettings({
    ...props.searchSettings,
    [stateProperty]: newValue,
  })

// Correctly center marks at each end of slider
const CustomMarksSlider = styled(Slider)({
  '& .MuiSlider-markLabel[data-index="0"]': {
    transform: 'translateX(-10%)',
  },
  '& .MuiSlider-markLabel[data-index="3"]': {
    transform: 'translateX(-100%)',
  },
  // '& .MuiSlider-markLabel': {
  //   fontSize: "10px",
  //   top: "25px"
  // },
  // '& .MuiSlider-thumb': {
  //   width: "8px",
  //   height: "8px"
  // },
})

// ---
// Each following component is a settings component */
// ---

GSDComponent.propTypes = {
  GSD_STEPS: PropTypes.arrayOf(PropTypes.number),
  searchSettings: PropTypes.any,
  setSearchSettings: PropTypes.func,
}
function GSDComponent(props): React.ReactElement {
  const GSD_STEPS = props.GSD_STEPS
  function GSDFromIndex(gsdIndex: number): string {
    const gsdMeters = GSD_STEPS[gsdIndex]
    return gsdMeters < 1 ? `${Math.floor(gsdMeters * 100)}cm` : `${gsdMeters as number}m`
  }

  const GSDMarks = [0, 3, 6, 8].map((i) => ({
    value: i,
    label: GSDFromIndex(i),
  }))

  return (
    <>
      <SettingsHeader icon={faTableCellsLarge} title={'GSD Resolution'} value={GSDFromIndex(props.searchSettings.gsdIndex[1])} />
      <div style={{ marginLeft: '7px', marginRight: '7px' }}>
        <CustomMarksSlider {...(defaultSliderProps as any)} min={0} max={GSD_STEPS.length - 1} marks={GSDMarks} value={props.searchSettings.gsdIndex} valueLabelFormat={GSDFromIndex} onChange={handleSliderFun('gsdIndex', props)} />
      </div>
      <Box sx={{ m: 1, p: 2 }} />
    </>
  )
}

// The following components share the same propTypes, simply searchSettings prop
CloudinessComponent.propTypes =
  AoiCoverageComponent.propTypes =
  SunElevationComponent.propTypes =
  OffNadirComponent.propTypes =
    {
      searchSettings: PropTypes.any,
      setSearchSettings: PropTypes.func,
    }

/* Cloudiness Component */
function CloudinessComponent(props): React.ReactElement {
  // const handleCloudCoverageSlider = (event: Event, newValue: number | number[]) =>
  //   props.setSearchSettings({
  //     ...props.searchSettings,
  //     cloudCoverage: newValue
  //   })
  return (
    <>
      <SettingsHeader icon={faCloudSun} title={'Cloudiness'} value={`≤ ${props.searchSettings.cloudCoverage as number} %`} />
      <div style={{ marginLeft: '7px', marginRight: '7px' }}>
        <Slider
          {...(defaultSliderProps as any)}
          value={props.searchSettings.cloudCoverage}
          // onChange={handleCloudCoverageSlider}
          // onChange={props.handleSlider('cloudCoverage')}
          onChange={handleSliderFun('cloudCoverage', props)}
          valueLabelFormat={(value) => `${value}%`}
        />
      </div>
    </>
  )
}

/* ADVANCED SETTINGS COMPONENT */
function AoiCoverageComponent(props): React.ReactElement {
  return (
    <>
      <SettingsHeader icon={faCropSimple} title={'AOI Coverage'} value={`≥ ${props.searchSettings.aoiCoverage as number}%`} />
      <div style={{ marginLeft: '7px', marginRight: '7px' }}>
        <Slider
          {...(defaultSliderProps as any)}
          value={props.searchSettings.aoiCoverage}
          // onChange={props.handleSlider('aoiCoverage')}
          onChange={handleSliderFun('aoiCoverage', props)}
          track="inverted"
          valueLabelFormat={appendSuffix('%')}
        />
      </div>
    </>
  )
}

function SunElevationComponent(props): React.ReactElement {
  return (
    <>
      <SettingsHeader title={'Sun Elevation'} value={`${props.searchSettings.sunElevation[0] as number}° ≤ x ≤ ${props.searchSettings.sunElevation[1] as number}°`} />
      <div style={{ marginLeft: '7px', marginRight: '7px' }}>
        <Slider {...(defaultSliderProps as any)} min={0} max={90} value={props.searchSettings.sunElevation} onChange={handleSliderFun('sunElevation', props)} valueLabelFormat={appendSuffix('°')} />
      </div>
    </>
  )
}
function OffNadirComponent(props): React.ReactElement {
  return (
    <>
      <SettingsHeader title={'Off Nadir Angle'} value={`${props.searchSettings.offNadirAngle[0] as number}° ≤ x ≤ ${props.searchSettings.offNadirAngle[1] as number}°`} />
      <div style={{ marginLeft: '7px', marginRight: '7px' }}>
        <Slider {...(defaultSliderProps as any)} min={-60} max={60} value={props.searchSettings.offNadirAngle} onChange={handleSliderFun('offNadirAngle', props)} valueLabelFormat={appendSuffix('°')} />
      </div>
    </>
  )
}

AdvancedSettingsComponent.propTypes = {
  searchSettings: PropTypes.any,
  setSearchSettings: PropTypes.func,
}
function AdvancedSettingsComponent(props): React.ReactElement {
  // const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = React.useState(true)
  const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = useLocalStorage('UI_collapsed_advancedSettings', true)
  return (
    <>
      <Typography variant="subtitle2" onClick={() => setAdvancedSettingsCollapsed(!advancedSettingsCollapsed)} sx={{ cursor: 'pointer', zIndex: 10 }}>
        <FontAwesomeIcon icon={faGear} />
        &nbsp; Advanced &nbsp;
        {advancedSettingsCollapsed ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronUp} />}
      </Typography>
      <Collapse in={!advancedSettingsCollapsed} timeout="auto" unmountOnExit>
        <AoiCoverageComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
        <SunElevationComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
        <OffNadirComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />
      </Collapse>
    </>
  )
}

SettingsComponent.propTypes = {
  searchSettings: PropTypes.any,
  setSearchSettings: PropTypes.func,
  GSD_STEPS: PropTypes.arrayOf(PropTypes.number),
  providersTreeviewDataSelection: PropTypes.any,
  setProvidersTreeviewDataSelection: PropTypes.func,
}
function SettingsComponent(props): React.ReactElement {
  return (
    <>
      <GSDComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} GSD_STEPS={props.GSD_STEPS} />
      <CloudinessComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />

      <AdvancedSettingsComponent searchSettings={props.searchSettings} setSearchSettings={props.setSearchSettings} />

      <SatelliteImagerySourcesTreeview setProvidersTreeviewDataSelection={props.setProvidersTreeviewDataSelection} providersTreeviewDataSelection={props.providersTreeviewDataSelection} />
    </>
  )
}

export default React.memo(SettingsComponent)
