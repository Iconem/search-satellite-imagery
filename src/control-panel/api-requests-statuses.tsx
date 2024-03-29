import * as React from 'react'

import { Collapse, List, ListItem, ListItemText, ListItemIcon, Typography } from '@mui/material'

import { useLocalStorage } from '../utilities'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faCheck, faSatelliteDish } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'

/* API Request Status */
APIRequestsStatuses.propTypes = {
  searchPromises: PropTypes.any,
  theme: PropTypes.any,
  searchResults: PropTypes.any,
}
function APIRequestsStatuses(props): React.ReactElement {
  // const [apiRequestsStatusesCollapsed, setApiRequestsStatusesCollapsed] = React.useState(false)
  const [apiRequestsStatusesCollapsed, setApiRequestsStatusesCollapsed] = useLocalStorage('UI_collapsed_apiRequestsStatuses', false)

  const textColor = (o): any => (!o.searchFinished ? props.theme.palette.text.primary : o.errorOnFetch ? props.theme.palette.error.light : props.theme.palette.success.light)

  return (
    <>
      {props.searchPromises && !Object.values(props.searchPromises).every((o: any) => o.searchFinishedForMoreThanDelay) && (
        <>
          <Typography variant="subtitle2" onClick={() => setApiRequestsStatusesCollapsed(!apiRequestsStatusesCollapsed)} sx={{ cursor: 'pointer', zIndex: 10 }}>
            <FontAwesomeIcon icon={faSatelliteDish} />
            &nbsp; Ongoing API Requests for search &nbsp;
            {apiRequestsStatusesCollapsed ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronUp} />}
          </Typography>
          <Collapse in={!apiRequestsStatusesCollapsed} timeout="auto" unmountOnExit style={{ minHeight: 'auto' }}>
            <List dense={true}>
              {Object.values(props.searchPromises)
                .filter((o: any) => !o.searchFinishedForMoreThanDelay)
                .map((o: any, i) => (
                  <ListItem key={i} sx={{ color: textColor(o) }}>
                    <ListItemIcon sx={{ color: textColor(o) }}>{!o.searchFinished ? <Typography>...</Typography> : <FontAwesomeIcon icon={faCheck} />}</ListItemIcon>
                    <ListItemText primary={!o.searchFinished ? `Searching ${o.provider as string}...` : o.errorOnFetch ? `Error on Fetch for ${o.provider as string}` : `${props.searchResults?.output?.features?.filter((f) => f.properties.provider?.toLowerCase().startsWith(o.provider?.toLowerCase())).length as number} results returned by ${o.provider as string}!`} secondary={null} />
                  </ListItem>
                ))}
            </List>
          </Collapse>
        </>
      )}
    </>
  )
}

export default APIRequestsStatuses
