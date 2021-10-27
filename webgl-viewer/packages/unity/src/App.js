import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Link from '@material-ui/core/Link';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import GitHubIcon from '@material-ui/icons/GitHub';
import InfoIcon from '@material-ui/icons/Info';
import HomePopup from './HomePopup'
import TryPopup from './TryPopup'
import FormatPopup from './FormatPopup'
import Viewer from './Viewer';
import catalog from './catalog.json'
import { useSnackbar } from 'notistack';

const drawerWidth = 310;

const useStyles = makeStyles((theme) => ({
  grow: {
    flexGrow: 1,
  },
  root: {
    display: 'flex',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 2,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing(7) + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9) + 1,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    height: "60px",
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(1),
    height: "100vh",
    width: "100%"
  },
  innerContent: {
    display: 'flex',
    height: "calc(100vh - 80px)",
    width: "100%"
  },
  sectionDesktop: {
    display: 'none',
    [theme.breakpoints.up('md')]: {
      display: 'flex',
    },
  },
  sectionMobile: {
    display: 'flex',
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

export default function App() {
  const classes = useStyles();
  const theme = useTheme();

  /** Snack bars */
  const { enqueueSnackbar } = useSnackbar();

  const showSnackbar = (variant, message) => {
    // variant could be success, error, warning, info, or default
    enqueueSnackbar(message, { variant });
  };


  /** Home popup */
  const shouldOpenHomePopup = () => {
    if (typeof localStorage != 'undefined') {
      return localStorage.getItem('homePopup') == null;
    }
    else return true;
  }

  const onCloseHomePopup = () => {
    if (typeof localStorage != 'undefined') {
      localStorage.setItem('homePopup', true);
    }
  }

  const [homePopupOpened, sethomePopupOpened] = React.useState(shouldOpenHomePopup());

  /** Try popup */
  const [tryPopupOpened, setTryPopupOpened] = React.useState(false);

  const openTryPopup = () => {
    autoOpenDrawer();
    setTryPopupOpened(true);
  }

  /** Format popup */
  const [formatPopupOpened, setFormatPopupOpened] = React.useState(false);
  const [openedFormat, setOpenedFormat] = React.useState(null);

  /** Viewer */
  const [file, setFile] = React.useState(window.location + "formats/FBX/models/box.fbx");

  const onViewerReady = () => {
    setShowProgress(false)
  }

  const onViewerLoaded = () => {
    showSnackbar("success", "Model loaded with success")
    setShowProgress(false)
  }

  const onViewerError = () => {
    showSnackbar("error", "An error has occurred. If you are trying to load a model, could you please email it to me at rufus31415@gmail.com ?")
    setShowProgress(false)
  }

  /** left drawer */
  const shouldOpenDrawer = () => window.innerWidth / window.innerHeight > 1;
  const [open, setOpen] = React.useState(shouldOpenDrawer());
  const autoOpenDrawer = () => { if (open) setOpen(shouldOpenDrawer()) };

  const handleDrawerOpen = () => setOpen(true);

  const handleDrawerClose = () => setOpen(false);

  window.addEventListener("resize", autoOpenDrawer, false);
  window.addEventListener("orientationchange", autoOpenDrawer, false);

  /** Menu right */

  const openFormatPopup = (format) => {
    autoOpenDrawer();
    setOpenedFormat(format);
    setFormatPopupOpened(true);
  }

  const onClickInfo = () => sethomePopupOpened(true);

  /** Progress */
  const [showProgress, setShowProgress] = React.useState(true);


  return (
    <div className={classes.root}>
      <HomePopup
        open={homePopupOpened}
        setOpen={sethomePopupOpened}
        onClose={onCloseHomePopup}
      />
      <TryPopup
        open={tryPopupOpened}
        setOpen={setTryPopupOpened}
        setFile={setFile}
      />
      <FormatPopup
        open={formatPopupOpened}
        setOpen={setFormatPopupOpened}
        format={openedFormat}
        setFile={setFile}
      />

      <CssBaseline />
      <AppBar
        position="fixed"
        className={clsx(classes.appBar, {
          [classes.appBarShift]: open,
        })}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            className={clsx(classes.menuButton, {
              [classes.hide]: open,
            })}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            3D file Viewer
          </Typography>
          <div className={classes.grow} />
          <div className={classes.sectionDesktop}>
            <Link href="https://github.com/rufus31415" color="inherit" target="_blank">
              <Button
                color="inherit"
                className={classes.button}
                startIcon={<GitHubIcon />}
              >
                GitHub
            </Button>
            </Link>
            <Button
              color="inherit"
              className={classes.button}
              startIcon={<InfoIcon />}
              onClick={onClickInfo}
            >
              Info
            </Button>
          </div>
          <div className={classes.sectionMobile}>
            <Link href="https://github.com/rufus31415" color="inherit" target="_blank">
              <IconButton
                aria-label="GitHub"
                aria-haspopup="true"
                color="inherit"
              >
                <GitHubIcon />
              </IconButton>
            </Link>
            <IconButton
              aria-label="Info"
              aria-haspopup="true"
              onClick={null}
              color="inherit"
              onClick={onClickInfo}
            >
              <InfoIcon />
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        className={clsx(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: clsx({
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
        }}
      >
        <div className={classes.toolbar}>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </div>
        <Divider />
        <List>
          <ListItem button
            key="browser"
            onClick={openTryPopup}
          >
            <ListItemIcon><OpenInBrowserIcon /></ListItemIcon>
            <ListItemText primary="Try my files" />
          </ListItem>
        </List>
        <Divider />
        <List>
          {catalog.formats.map((format, index) => (
            <ListItem button
              key={format.id}
              onClick={() => openFormatPopup(format)}
            >
              <ListItemIcon><img src={"formats/" + format.id + "/icon.png"} /></ListItemIcon>
              <ListItemText primary={format.name} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      <main className={classes.content}>
        <div className={classes.toolbar} />

        <Paper elevation={3} className={classes.innerContent}>
          <Backdrop className={classes.backdrop} open={showProgress} >
            <CircularProgress color="inherit" />
          </Backdrop>
          <Viewer
            file={file}
            onReady={onViewerReady}
            onLoaded={onViewerLoaded}
            onError={onViewerError}
          />
        </Paper>

      </main>
    </div>
  );
}