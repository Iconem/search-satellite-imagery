// Timeline Component 
// based on visx

import * as React from 'react';
import {Typography, Box} from '@mui/material';
import { ThemeProvider, lighten, darken } from '@mui/material/styles';
import {theme} from '../theme';


import {
  XYChart, GlyphSeries, BarSeries,
  Axis, Grid, Tooltip,
  Annotation, AnnotationConnector, AnnotationCircleSubject, AnnotationLineSubject, AnnotationLabel
} from '@visx/xychart';

import {GlyphCircle} from '@visx/glyph'

const accessors = {
  xAccessor: d => (d?.properties?.acquisitionDate && new Date(d?.properties?.acquisitionDate)) || null,
  yAccessor: d => 0, // d.y,
};


function TimelineComponent(props) {

  const outerWidth = 500
  const outerHeight = 300
  const margin = { top: 40, left: 80, right: 80, bottom: 80 }
  const annotationType = 'circle'

  return (
    <ThemeProvider theme={theme}>
      {props.searchResults && props.searchResults['features'] && props.searchResults['features'].length > 0 &&
        <div 
        className="control-panel" 
        style={{
          background: theme.palette.background.default,
          color: theme.palette.text.primary, 
          width: '1450px',

          position: 'absolute',
          bottom: '3%',
          left: '1%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          outline: 'none',
          overflow: 'auto',
        }}
      >
        {/*         
        <Typography gutterBottom>
          Timeline
        </Typography>
        <Box sx={{ m: 1 }}/> 
        */}



          <XYChart 
            height={110} 
            xScale={{ type: 'time' }} 
            yScale={{ type: "linear", domain: [0, 1], zero: false }}
          >
            <Axis orientation="bottom" />
            <Grid rows={false} columns={false} numTicks={4} />
            <GlyphSeries 
              dataKey="Acquisition Dates" 
              data={props.searchResults['features']} 
              {...accessors} 
              renderGlyph={({ x, y }: any) => ( //  { left: number; top: number }
                <GlyphCircle 
                  left={x} top={y}
                  stroke={'#777'} // theme.palette.primary.main}
                  fill={'#fff'}
                  strokeWidth={2}
                />
              )}
            />
            {props.footprintFeatures && 
              <GlyphSeries 
                dataKey="Selected Result" 
                data={[props.footprintFeatures]} 
                {...accessors} 
                renderGlyph={({ x, y }: any) => ( 
                  <GlyphCircle 
                    left={x} top={y}
                    stroke={theme.palette.primary.main} // '#ff0000'} // 
                    fill={'#fff'}
                    strokeWidth={3}
                    size={100}
                    fillOpacity={1}
                  />
                )}
              />
            }

            {props.footprintFeatures && 
            
            <Annotation
              dataKey={"Selected Result"}
              datum={props.footprintFeatures}
              dx={0}
              dy={20} 
              
              // canEditSubject={false}
              // onDragEnd={({ dx, dy }) => setAnnotationLabelPosition({ dx, dy })}
            >
              {/* <AnnotationConnector /> */}
              {annotationType === 'circle' ? (
                <AnnotationCircleSubject 
                  stroke={'#000'}
                />
              ) : (
                <AnnotationLineSubject />
              )}
              {/* .toLocaleDateString([], {year: 'numeric', month: 'numeric', day: 'numeric'})}`} */}
              <AnnotationLabel
                title={`${accessors.xAccessor(props.footprintFeatures)?.toISOString().split('T')[0]}`}
                subtitle={''}
                width={135}
                // anchorLineStroke= {'rgba(0,255,0,0)'}
                showAnchorLine={false}
                backgroundProps={{
                  // fillOpacity: 0.6,
                  strokeWidth: 0,
                  // stroke: '#555',
                  strokeOpacity: 0,
                }}
              />
            </Annotation>}

            <Tooltip
              snapTooltipToDatumX
              snapTooltipToDatumY
              showVerticalCrosshair
              showSeriesGlyphs
              renderTooltip={({ tooltipData, colorScale }) => (
                <div>
                  <div style={{ color: colorScale(tooltipData.nearestDatum.key) }}>
                    {tooltipData.nearestDatum.key}
                  </div>
                  {accessors.xAccessor(tooltipData.nearestDatum.datum)}
                  {', '}
                  {accessors.yAccessor(tooltipData.nearestDatum.datum)}
                </div>
              )}
            />
          </XYChart>

      </div>
      }

    </ThemeProvider>
  );
}

export default React.memo(TimelineComponent);
