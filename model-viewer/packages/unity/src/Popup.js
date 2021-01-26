import React from 'react';
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import { withStyles } from '@material-ui/core/styles';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Typography from '@material-ui/core/Typography';




const styles = (theme) => ({
    root: {
        margin: 0,
        padding: theme.spacing(2),
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
});

export default function Popup(props) {
    const { open, setOpen, title, innerContent, icon, closeText, onClose, transition } = props;

    const handleClose = () => {
        setOpen(false);
        if(onClose)  onClose();
    };

    const descriptionElementRef = React.useRef(null);
    React.useEffect(() => {
        if (open) {
            const { current: descriptionElement } = descriptionElementRef;
            if (descriptionElement !== null) {
                descriptionElement.focus();
            }
        }
    }, [open]);

    const DialogTitle = withStyles(styles)((props) => {
        const { children, classes, onClose, ...other } = props;
        return (
            <MuiDialogTitle disableTypography className={classes.root} {...other}>
                <Typography variant="h6">{children}</Typography>
                <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </MuiDialogTitle>
        );
    });


    return (
        <div>
            <Dialog
                open={open}
                onClose={handleClose}
                scroll="paper"
                aria-labelledby="scroll-dialog-title"
                aria-describedby="scroll-dialog-description"
                TransitionComponent={transition}
            >
                <DialogTitle
                    id="scroll-dialog-title"
                    onClose={handleClose}
                >
                    <ListItem >
                        <ListItemIcon>
                            {icon}
                        </ListItemIcon>
                        <ListItemText primary={title} />
                    </ListItem>
                </DialogTitle>
                <DialogContent dividers={true}>
                    {innerContent}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        {closeText}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
