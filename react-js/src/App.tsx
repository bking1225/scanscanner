import React from 'react';
import {AppBar} from "@material-ui/core";

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
import {ScanbotSdkService} from "./service/scanbot-sdk-service";
import Swal from "sweetalert2";
import {ImageFilter} from "scanbot-web-sdk/@types/model/filter-types";

const history = createBrowserHistory();

export default class App extends React.Component<any, any> {

    constructor(props: any) {
        super(props);
        this.state = {
            alert: undefined,
            activeImage: undefined,
            sdk: undefined
        };
    }

    async componentDidMount() {
        const sdk = await ScanbotSdkService.instance.initialize();
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
            return <DocumentScannerPage sdk={this.state.sdk} onDocumentDetected={this.onDocumentDetected.bind(this)}/>;
        }
        if (route === FeatureId.CroppingView) {
            return <CroppingPage sdk={this.state.sdk}/>;
        }
        if (route === FeatureId.ImageDetails) {
            return <ImageDetailPage image={this.state.activeImage}/>
        }
        if (route === FeatureId.ImageResults) {
            return <ImageResultsPage
                sdk={this.state.sdk}
                onDetailButtonClick={async (index: number) => {
                    Pages.instance.setActiveItem(index);
                    this.setState({activeImage: await ScanbotSdkService.instance.documentImageAsBase64(index)});
                    history.push("#/image-details?index=" + index);
                }}/>
        }
    }

    private decideButtons() {
        const route = NavigationUtils.findRoute();
        if (route === FeatureId.DocumentScanner) {
            return [
                {text: Pages.instance.count() + " PAGES", action: undefined},
                {
                    text: "DONE", action: () => {
                        this.onBackPress()
                    }, right: true
                }
            ];
        }
        if (route === FeatureId.ImageResults) {
            return [
                {
                    text: "SAVE PDF", action: () => {
                    }
                },
                {
                    text: "DELETE", action: () => {
                    }, right: true
                }
            ];
        }
        if (route === FeatureId.ImageDetails) {
            return [
                {
                    text: "CROP", action: async () => {
                        const index = parseInt(window.location.href.split("?")[1].split("=")[1]);
                        const bytes = Pages.instance.imageAtIndex(index);
                        if (bytes) {
                            this.setState({detailImage: await this.props.sdk.toDataUrl(bytes)});
                        }
                        const path = "#/" + FeatureId.CroppingView + "?index=" + Pages.instance.getActiveIndex();
                        history.push(path);
                    }
                },
                {
                    text: "FILTER", action: async () => {

                        const page = Pages.instance.getActiveItem();
                        const result = await Swal.fire({
                            title: 'Select filter',
                            input: 'select',
                            inputOptions: ScanbotSdkService.instance.availableFilters(),
                            inputPlaceholder: page.filter ?? "none"
                        });

                        const filter = ScanbotSdkService.instance.filterByIndex(result.value);

                        // "None" is not an actual filter, only used in this example app
                        if (filter === "none") {
                            page.filter = undefined;
                            page.filtered = undefined;
                        } else {
                            page.filter = filter;
                            page.filtered = await ScanbotSdkService.instance.applyFilter(
                                page.cropped ?? page.original,
                                filter as ImageFilter);
                        }

                        const index = Pages.instance.getActiveIndex();
                        this.setState({activeImage: await ScanbotSdkService.instance.documentImageAsBase64(index)});
                    }
                }
            ];
        }

        if (route == FeatureId.CroppingView) {
            return [
                {
                    text: "DETECT", action: async () => {
                        await ScanbotSdkService.instance.croppingView?.detect()
                    }
                },
                {
                    text: "ROTATE", action: async () => {
                        await ScanbotSdkService.instance.croppingView?.rotate(1)
                    }
                },
                {
                    text: "APPLY", action: async () => {
                        const result = await ScanbotSdkService.instance.croppingView?.apply();
                        Pages.instance.updateActiveItem(result);
                        this.onBackPress();
                    }, right: true
                }
            ]
        }
    }

    async onDocumentDetected(result: any) {
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

