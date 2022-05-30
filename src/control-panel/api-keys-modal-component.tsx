// Component to define API keys for each satellite archive aggregator

import * as React from 'react';
import { Button, TextField, List, ListItem, Link, Modal, Backdrop, Fade, Box, Typography, Divider } from '@mui/material';

function ApiKeysModalComponent(props) {
  const [infoModalOpen, setInfoModalOpen] = React.useState(false);
  
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
  };

  // apiKeys={apiKeys} setApiKeys={setApiKeys
  
  return (
    <>
      <Button onClick={() => setInfoModalOpen(true)}>Set API keys</Button>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
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
                <Typography variant="h6"> UP42 </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField 
                  value={props.apiKeys['UP42']['projectId']} 
                  onChange={(event) => props.setApiKeys({
                    ...props.apiKeys, 
                    'UP42': {
                      ...props.apiKeys['UP42'], 
                      projectId: event.target.value,
                    }
                  })} 
                  label="UP42 Project ID" 
                  type="search" 
                  sx={{ width: '50%' }}
                  />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField 
                  value={props.apiKeys['UP42']['projectApiKey']} 
                  onChange={(event) => props.setApiKeys({
                    ...props.apiKeys, 
                    'UP42': {
                      ...props.apiKeys['UP42'], 
                      projectApiKey: event.target.value,
                    }
                  })} 
                  label="UP42 Project API key" 
                  type="search" 
                  sx={{ width: '50%' }}
                  />
              </ListItem>
              
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6"> EOS </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField 
                  value={props.apiKeys['EOS']} 
                  onChange={(event) => props.setApiKeys({
                    ...props.apiKeys, 
                    'EOS': event.target.value
                  })} 
                  label="EOS API key" 
                  type="search" 
                  sx={{ width: '50%' }}
                  />
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <Typography variant="h6"> SKYWATCH </Typography>
              </ListItem>
              <ListItem sx={{ display: 'list-item' }}>
                <TextField 
                value={props.apiKeys['SKYWATCH']} 
                onChange={(event) => props.setApiKeys({
                  ...props.apiKeys, 
                  'SKYWATCH': event.target.value
                })} 
                label="SKYWATCH API key" 
                type="search" 
                sx={{ width: '50%' }}
              />
              </ListItem>
            </List>

            <Divider variant="middle" />
            <Typography>
              {/* <List sx={{listStyleType: 'disc' }}> */}
              <List >
                <ListItem sx={{ display: 'list-item'}}>
                UP42: Project ID and Project API Key can be found in the Developers section on the <Link href="https://console.up42.com/">console</Link>, in the form of 
                <Box bgcolor="text.disabled" sx={{p:2, borderRadius: '3px', width: 'fit-content', backgroundColor: '#DDD'}} >https://console.up42.com/projects/UUID-xxxx/developers</Box>
                </ListItem>
                <ListItem sx={{ display: 'list-item' }}>
                EOS api key can be found on your <Link href="https://api-connect.eos.com/user-dashboard/">user dashboard</Link>. See the <Link href="https://doc.eos.com/api/#authorization-api">API section of the docs</Link>
                </ListItem>
                <ListItem sx={{ display: 'list-item' }}>
                Skywatch API key can be found on your user <Link href="https://dashboard.skywatch.co/account/profile">account profile</Link> 
                </ListItem>
              </List>
            </Typography>
          </Box>
        </Fade>
      </Modal>
    </>
  );
}

export default React.memo(ApiKeysModalComponent);