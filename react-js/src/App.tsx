import React from 'react';
import {AppBar, Snackbar, Toolbar} from "@material-ui/core";
import MuiAlert from '@material-ui/lab/Alert';

// Import SDK from webpack directory to ensure web assembly binary and worker and bundled with webpack
import ScanbotSDK from "scanbot-web-sdk/webpack";

// Other typings should be imported from @types
import {DocumentScannerConfiguration} from "scanbot-web-sdk/@types/model/configuration/document-scanner-configuration";
import {DetectionResult} from "scanbot-web-sdk/@types/model/response/detection-result";

import {ICroppingViewHandle} from "scanbot-web-sdk/@types/interfaces/i-cropping-view-handle";
import FeatureList from "./subviews/FeatureList";
import DocumentScannerPage from "./pages/document-scanner-page";
import ImageResultsPage from "./pages/image-results-page";
import {FeatureId} from "./model/Features";
import {createBrowserHistory} from "history";
import ImageDetailPage from "./pages/image-detail-page";
import {BottomBar} from "./subviews/BottomBar";
import Pages from "./model/Pages";
import CroppingPage from "./pages/cropping-page";
import {ImageUtils} from "./utils/image-utils";
import {Toast} from "./subviews/toast";
import {NavigationContent} from "./subviews/navigation-content";
import {NavigationUtils} from "./utils/navigation-utils";

const history = createBrowserHistory();

export default class App extends React.Component<any, any> {

    license = "";

    croppingView?: ICroppingViewHandle;

    constructor(props: any) {
        super(props);
        this.state = {
            alert: undefined,
            image: undefined,
            sdk: undefined
        };
    }

    async componentDidMount() {
        const sdk = await ScanbotSDK.initialize({licenseKey: this.license, engine: "/"});
        this.setState({sdk: sdk});

        history.listen(update => {
            this.forceUpdate();
        });
    }

    onBackPress() {
        history.back();
    }

    navigation?: any;

    toolbarHeight() {
        return (this.navigation as HTMLHeadingElement)?.clientHeight ?? 0;
    }
    containerHeight() {
        if (!this.navigation) {
            return "100%";
        }
        return (window.innerHeight - 2 * this.toolbarHeight()) ?? 0;
    }

    render() {
        return (
            <div>
                <input className="file-picker" type="file" accept="image/jpeg" width="48"
                       height="48" style={{display: "none"}}/>
                <Toast alert={this.state.alert} onClose={() => this.setState({alert: undefined})}/>

                <AppBar position="fixed" ref={ref => this.navigation = ref}>
                    <NavigationContent backVisible={!NavigationUtils.isAtRoot()} onBackClick={() => this.onBackPress()}/>
                </AppBar>
                <div style={{height: this.containerHeight(), marginTop: this.toolbarHeight()}}>
                    {this.decideContent()}
                </div>
                <BottomBar hidden={NavigationUtils.isAtRoot()} height={this.toolbarHeight()} buttons={this.decideButtons()}/>
            </div>
        );
    }

    decideContent() {
        const route = NavigationUtils.findRoute();
        if (NavigationUtils.isAtRoot()) {
            return <FeatureList onItemClick={this.onFeatureClick.bind(this)}/>
        }
        if (route == FeatureId.DocumentScanner) {
            return <DocumentScannerPage sdk={this.state.sdk}
                                        onDocumentDetected={this.onDocumentDetected.bind(this)}/>;
        }
        if (route === FeatureId.CroppingView) {
            return <CroppingPage sdk={this.state.sdk}/>;
        }
        if (route === FeatureId.ImageDetails) {
            return <ImageDetailPage sdk={this.state.sdk}/>
        }
        if (route === FeatureId.ImageResults) {
            return <ImageResultsPage
                sdk={this.state.sdk}
                onDetailButtonClick={(index: number) => {
                    Pages.instance.setActiveItem(index);
                    history.push("#/image-details?index=" + index);
                }}/>
        }
    }

    private decideButtons() {
        const route = NavigationUtils.findRoute();
        if (route === FeatureId.DocumentScanner) {
            return [
                {text: Pages.instance.count() + " PAGES", action: undefined},
                {text: "DONE", action: () => {this.onBackPress()}, right: true}
            ];
        }
        if (route === FeatureId.ImageResults) {
            return [
                {text: "SAVE PDF", action: () => {}},
                {text: "DELETE", action: () => {}, right: true}
            ];
        }
        if (route === FeatureId.ImageDetails) {
            return [
                {text: "CROP", action: () => {
                        const path = "#/" + FeatureId.CroppingView + "?index=" + Pages.instance.getActiveIndex();
                        history.push(path);
                    }},
                {text: "FILTER", action: () => {}}
            ];
        }
        if (route == FeatureId.CroppingView) {
            return [
                {text: "DETECT", action: () => {}},
                {text: "ROTATE", action: () => {}},
                {text: "APPLY", action: () => {}, right: true}
            ]
        }
    }

    async onDocumentDetected(result: DetectionResult) {
        Pages.instance.add(result);
        this.forceUpdate();
    }

    async onFeatureClick(feature: any) {
        if (feature.route) {
            history.push("#/" + feature.route);
            return;
        }

        if (feature.id === FeatureId.LicenseInfo) {
            const info = await this.state.sdk?.getLicenseInfo();
            const color = (info?.status === "Trial") ? "success" : "error";
            this.setState({alert: {color: color, text: JSON.stringify(info)}});
        } else if (feature.id === FeatureId.ImagePicker) {
            const result = await ImageUtils.pick();
            Pages.instance.add(result)
        }

    }
}

