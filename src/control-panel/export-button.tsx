import * as React from 'react';

import { Button, Box, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

/* Export Button has GeoJSON logic */
function ExportButton(props) {
  function handleExportButtonClick() {
    const geojson_obj = JSON.parse(JSON.stringify(props.searchResults.output)); // deep copy
    geojson_obj.features.forEach((f) => {
      f.properties['fill-opacity'] = 0;
      f.properties['stroke-width'] = 1;
    });

    geojson_obj.features.unshift(props.searchResults.input);

    const fileData = JSON.stringify(geojson_obj);
    const blob = new Blob([fileData], { type: 'text/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.click();
    link.download = 'search-results.geojson';
    link.href = url;
    link.click();

    // Could define these styles for each geojson feature properties, and use QGIS/Fill-Color/Data-Defined-Overrides/Field-type:string
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ m: 1, position: 'relative', width: '100%' }}>
        <Button variant="contained" sx={{ width: '100%', minWidth: '0' }} disabled={!(props.searchResults?.output?.features?.length > 0)} onClick={handleExportButtonClick}>
          <Tooltip title={'Export results as GeoJSON'}>
            <strong>
              {' '}
              <FontAwesomeIcon icon={faDownload} />{' '}
            </strong>
          </Tooltip>
        </Button>
      </Box>
    </Box>
  );
}

export default ExportButton;
