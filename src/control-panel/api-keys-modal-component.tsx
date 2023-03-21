// Component to define API keys for each satellite archive aggregator

import * as React from 'react'
import { Button, TextField, List, ListItem, Link, Modal, Backdrop, Fade, Box, Typography, Divider } from '@mui/material'
import { Providers } from '../archive-apis/search-utilities'
import PropTypes from 'prop-types'

ApiKeysModalComponent.propTypes = {
  apiKeys: PropTypes.any,
  setApiKeys: PropTypes.func,
}

function ApiKeysModalComponent(props): React.ReactElement {
  const [infoModalOpen, setInfoModalOpen] = React.useState(false)

  const infoModalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 10,
  }

  return (
    <>
      <Button
        onClick={() => {
          setInfoModalOpen(true)
        }}
      >
        Set API keys
      </Button>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={infoModalOpen}
        onClose={() => {
          setInfoModalOpen(false)
        }}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={infoModalOpen}>
          <Box sx={infoModalStyle}>
            <Typography variant="h5" component="h2">
              API Keys for satellite archive retrieval
            </Typography>

            <List>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography>No API keys needed for the following APIs:</Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://map.openaerialmap.org/" target="_blank">
                    Open Aerial Map
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://headfinder.head-aerospace.eu/sales" target="_blank">
                    Head Aerospace Finder
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://app.skyfi.com/explore" target="_blank">
                    SkyFi App
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://imagehunter.apollomapping.com/" target="_blank">
                    Apollo Mapping Image Hunter
                  </Link>{' '}
                </Typography>
              </ListItem>
            </List>

            <Divider variant="middle" />

            <List>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography>API keys needed for the following APIs:</Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Link href="https://console.up42.com/catalog/" target="_blank">
                  {' '}
                  <Typography variant="h6"> UP42 Console </Typography>
                </Link>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.UP42].projectId}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.UP42]: {
                        ...props.apiKeys[Providers.UP42],
                        projectId: event.target.value,
                      },
                    })
                  }
                  label="UP42 Project ID"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.UP42].projectApiKey}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.UP42]: {
                        ...props.apiKeys[Providers.UP42],
                        projectApiKey: event.target.value,
                      },
                    })
                  }
                  label="UP42 Project API key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>

              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://eos.com/landviewer/" target="_blank">
                    EOS Landviewer
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.EOS]}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.EOS]: event.target.value,
                    })
                  }
                  label="EOS API key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://console.earthcache.com/search-archive/" target="_blank">
                    Skywatch Earthcache
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.SKYWATCH]}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.SKYWATCH]: event.target.value,
                    })
                  }
                  label="SKYWATCH API key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6">
                  {' '}
                  <Link href="https://discover.maxar.com/" target="_blank">
                    Maxar Discover
                  </Link>{' '}
                </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.MAXAR_DIGITALGLOBE]}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.MAXAR_DIGITALGLOBE]: event.target.value,
                    })
                  }
                  label="MAXAR API key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Link href="https://api.arlula.com/" target="_blank">
                  {' '}
                  <Typography variant="h6"> ARLULA </Typography>
                </Link>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.ARLULA].apiKey}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.ARLULA]: {
                        ...props.apiKeys[Providers.ARLULA],
                        apiKey: event.target.value,
                      },
                    })
                  }
                  label="ARLULA API Key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField
                  value={props.apiKeys[Providers.ARLULA].apiSecurity}
                  onChange={(event) =>
                    props.setApiKeys({
                      ...props.apiKeys,
                      [Providers.ARLULA]: {
                        ...props.apiKeys[Providers.ARLULA],
                        apiSecurity: event.target.value,
                      },
                    })
                  }
                  label="ARLULA API Security key"
                  type="search"
                  sx={{ width: '50%' }}
                />
              </ListItem>
            </List>

            <Divider variant="middle" />
            {/* <List sx={{listStyleType: 'disc' }}> */}
            <List>
              <ListItem sx={{ display: 'list-item' }}>
                UP42: Project ID and Project API Key can be found in the Developers section of the selected project, on the{' '}
                <Link href="https://console.up42.com/" target="_blank">
                  console
                </Link>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                EOS api key can be found on your{' '}
                <Link href="https://api-connect.eos.com/user-dashboard/" target="_blank">
                  user dashboard
                </Link>
                . See the{' '}
                <Link href="https://doc.eos.com/api/#authorization-api" target="_blank">
                  API section of the docs
                </Link>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                Skywatch API key can be found on your user{' '}
                <Link href="https://dashboard.skywatch.co/account/profile" target="_blank">
                  account profile
                </Link>
              </ListItem>
            </List>
          </Box>
        </Fade>
      </Modal>
    </>
  )
}

export default React.memo(ApiKeysModalComponent)
