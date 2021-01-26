import React from 'react';
import DialogContentText from '@material-ui/core/DialogContentText';
import InfoIcon from '@material-ui/icons/Info';
import Popup from './Popup'
import Slide from '@material-ui/core/Slide';
import CodeBlock from "./CodeBlock";

// import md with raw-loader webpack plugin, see react-app-rewired and config-overrides.js
/* eslint import/no-webpack-loader-syntax: off */
import readme from '!raw-loader!../README.md'

import ReactMarkdown from 'react-markdown'

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />;
});


export default function HomePopup(props) {

    // remove the line to the demo
    const getText = () => {
       return readme.replace(/^Demo(.*)$/mg,"")
    }

    const content = (
    <DialogContentText>
         <ReactMarkdown 
         source={getText()} 
         renderers={{ code: CodeBlock }}
         />
    </DialogContentText>);

    return (
        <Popup
            title="About this 3D viewer"
            innerContent={content}
            icon={<InfoIcon />}
            closeText="Try it"
            transition = {Transition}
            {...props}
        />
    )
}
