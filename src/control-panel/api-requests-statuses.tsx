
import * as React from 'react';

import {Collapse, List, ListItem, ListItemText, ListItemIcon, Typography} from '@mui/material';

import {useLocalStorage} from '../utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faChevronDown, faChevronUp, faCheck, faSatelliteDish
} from '@fortawesome/free-solid-svg-icons'

/* API Request Status */
function APIRequestsStatuses(props) {
  // const [apiRequestsStatusesCollapsed, setApiRequestsStatusesCollapsed] = React.useState(false) 
  const [apiRequestsStatusesCollapsed, setApiRequestsStatusesCollapsed] = useLocalStorage('apiRequestsStatusesCollapsed', false);

  return (
    <>
      {(props.searchPromises 
        && !Object.values(props.searchPromises).every((o:any) => o.searchFinishedForMoreThanDelay)) 
        && 
        <>
          <Typography 
            variant="subtitle2" 
            onClick={() => setApiRequestsStatusesCollapsed(!apiRequestsStatusesCollapsed)} 
            sx={{cursor: 'pointer', zIndex: 10}}
          >
            <FontAwesomeIcon icon={faSatelliteDish} /> 
            &nbsp; Ongoing API Requests for search &nbsp; 
            {
              apiRequestsStatusesCollapsed ? 
              <FontAwesomeIcon icon={faChevronDown} /> : 
              <FontAwesomeIcon icon={faChevronUp} />
            }
          </Typography>
          <Collapse in={!apiRequestsStatusesCollapsed} timeout="auto" unmountOnExit>
          <List dense={true}>
            {Object.values(props.searchPromises)
              .filter((o:any) => !o.searchFinishedForMoreThanDelay)
              .map((o:any, i) => (
              <ListItem key={i} sx={{ color: o.searchFinished ? props.theme.palette.success.light : props.theme.palette.text.primary}}
              >
                <ListItemIcon
                  sx={{ color: o.searchFinished ? props.theme.palette.success.light : props.theme.palette.text.primary}}
                >
                  {!o.searchFinished ? ( <Typography>...</Typography>) : (<FontAwesomeIcon icon={faCheck} /> )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    !o.searchFinished ?
                    `Searching ${o.provider}...` : 
                    // `Results returned by ${o.provider} API!`
                    `${props.searchResults?.output?.features?.filter(f => f.properties.provider?.toLowerCase().includes(o.provider?.toLowerCase())).length} results returned by ${o.provider}!`
                  }
                  secondary={null}
                />
              </ListItem>
            )
            )}
          </List>
          </Collapse>
      </>
      }
    </>
  )
}

export default APIRequestsStatuses;
