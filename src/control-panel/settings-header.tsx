// Component to have a settings header with setting title on the left and setting value+text hint on the right

import * as React from 'react';
import { Typography, Grid } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/* Factorization Component of settings header and default slider properties */
function SettingsHeader(props) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={9}>
        <Typography variant="subtitle2">
          {props.icon && (
            <>
              <FontAwesomeIcon icon={props.icon} /> &nbsp;
            </>
          )}
          {props.title}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <Typography variant="subtitle2" align={'right'} style={{ paddingRight: '4px' }}>
          {props.value}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default React.memo(SettingsHeader);
