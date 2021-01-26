import React from 'react';
import Popup from './Popup'
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import DialogContent from '@material-ui/core/DialogContent';
import { makeStyles } from '@material-ui/core/styles';
import GridList from '@material-ui/core/GridList';
import Link from '@material-ui/core/Link';
import GridListTile from '@material-ui/core/GridListTile';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import ListSubheader from '@material-ui/core/ListSubheader';
import IconButton from '@material-ui/core/IconButton';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    margin: 0,
    padding: 0
  },
  gridList: {
  },
  icon: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  header: {
    marginBottom: 20,
  },
  tile: {
    cursor: "pointer",
    opacity: 0.7,
    '&:hover': {
      opacity: 1
    }
  },
}));


export default function FormatPopup(props) {
  const classes = useStyles();

  const onModelClick = (model) => {
    props.setOpen(false);
    if(model.file.startsWith("http")) props.setFile(model.file);
    else props.setFile(window.location  + model.file);
  }

  const content = props.format ? (
    <div>
      <div className={classes.header}>
        {props.format.description}
        <span>  <Link href={props.format.url} target="_blank">Read more...<OpenInNewIcon fontSize="inherit" /></Link></span>
      </div>
      <div className={classes.root}>

        <GridList cellHeight={180} className={classes.gridList}>
          {props.format.models.map((model) => (
            <GridListTile
              key={model.file}
              onClick={() => onModelClick(model)}
              className={classes.tile}
            >
              <img src={model.thumbnail} />
              <GridListTileBar
                title={model.name}
                subtitle={<span>{model.size}</span>}
                actionIcon={
                  <Link href={model.file} target="_blank">
                    <IconButton
                      className={classes.icon}>
                      <OpenInNewIcon />
                    </IconButton>
                  </Link>
                }
              />
            </GridListTile>
          ))}
        </GridList>
      </div>
    </div>
  ) : null

  return (
    <Popup
      innerContent={content}
      icon={<img src={"formats/" + props.format?.id + "/icon.png"} />}
      closeText="Close"
      title={props.format?.name + " (*." + props.format?.extension + ")"}
      {...props}
    />
  )
}
