import React from "react";
import {Styles} from "../model/Styles";
import {AppBar, Toolbar} from "@material-ui/core";

export class NavigationContent extends React.Component<any, any> {

    render() {
        return (
            <div style={{display: "flex", flexDirection: "row"}}>
                {this.props.backVisible && <button
                    style={Styles.backButton}
                    onClick={this.props.onBackClick}
                    dangerouslySetInnerHTML={{__html: "&#8249"}}
                />}
                <Toolbar>SCANBOT WEB SDK EXAMPLE</Toolbar>
            </div>
        );
    }
}
