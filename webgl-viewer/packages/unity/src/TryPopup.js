import React, { useMemo, useState } from 'react';
import Popup from './Popup'
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';
import DialogContent from '@material-ui/core/DialogContent';
import Button from '@material-ui/core/Button';
import { useDropzone } from 'react-dropzone';
import { makeStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';
import GetAppIcon from '@material-ui/icons/GetApp';

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: "100%",
    },
    input: {
        marginLeft: theme.spacing(1),
        flex: 1,
    },
    iconButton: {
        padding: 10,
    },
    divider: {
        height: 28,
        margin: 4,
    },
}));

const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#eeeeee',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};


const activeStyle = {
    borderColor: '#2196f3'
};

const acceptStyle = {
    borderColor: '#00e676'
};

const rejectStyle = {
    borderColor: '#ff1744'
};

export default function HomePopup(props) {
    const classes = useStyles();
    const { setFile } = props

    const [url, setUrl] = useState("");

    const onDrop = (files) => {
        if(files.length >0) loadFile(files[0]);
    }

    const { acceptedFiles,
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
        open
    } = useDropzone({ onDrop });

    const style = useMemo(() => ({
        ...baseStyle,
        ...(isDragActive ? activeStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
    }), [
        isDragActive,
        isDragReject,
        isDragAccept
    ]);

    const loadFile = (file) => {
        props.setOpen(false)
        setFile(file)
    }

    
    const content = (
        <DialogContent>
            <section>
                You can load your own file to test this viewer.
                If your file is not loading properly, could you please send it to me at <u>rufus31415@gmail.com</u> ?
                <h2>From URL</h2>
                Please enter a URL to your 3D file or to a public OnShape document.
                <div className={{ alignItems: 'center' }}>
                    <Paper component="form" className={classes.root}>
                        <InputBase
                            className={classes.input}
                            placeholder="https://"
                            onChange={(event) => setUrl(event.target.value)}
                            value={url}
                        />
                        <Divider className={classes.divider} orientation="vertical" />
                        <Button
                            className={classes.iconButton}
                            endIcon={<GetAppIcon />}
                            onClick={() => loadFile(url)}
                        >
                            Load
                        </Button>
                    </Paper>

                </div>
            </section>
            <section>
                <h2>From disk</h2>
                <div {...getRootProps({ style })}>
                    <input {...getInputProps()} />
                    <p>Drag 'n' drop a 3D file here</p>
                    <Button
                        type="button"
                        variant="contained"
                        onClick={open}>
                        Browse...
                    </Button>
                </div>
            </section>
        </DialogContent>
    );

    return (
        <Popup
            title="Try open my files"
            innerContent={content}
            icon={<OpenInBrowserIcon />}
            closeText="Close"
            {...props}
        />
    )
}
