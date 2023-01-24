import { ScanbotSdkService } from "../service/scanbot-sdk-service";
import { Barcode, BarcodeResult } from "scanbot-web-sdk/@types";
import BaseScannerComponent from "./common/base-scanner-component";
import { AnimationType } from "./enum/animation-type";
import Barcodes from "../model/barcodes";

export default class BarcodeScannerComponent extends BaseScannerComponent {
  render() {
    return this.controller(
      ScanbotSdkService.BARCODE_SCANNER_CONTAINER,
      "Barcode Scanner",
      this.labelText(),
      () => {
        ScanbotSdkService.instance.barcodeScanner?.swapCameraFacing(true);
      }
    );
  }

  onBarcodesDetected(result: BarcodeResult) {
    for (let i = 0; i < result.barcodes.length; i++) {
      console.log(`Barcode image length: ${result.barcodes[i].barcodeImage?.length || 0} for barcode ${i}`);
    }

    this.props.onBarcodesDetected(result);
    document.getElementById("count-label")!.innerHTML = this.labelText();
  }

  onBarcodeScannerError(e: Error) {
    console.log(e.name + ': ' + e.message);
    alert(e.name + ': ' + e.message);
  }

  labelText() {
    return Barcodes.instance.count() + " Barcodes";
  }

  async push(type: AnimationType) {
    super.push(type);
    this.pushType = type;
    this.updateAnimationType(type, async () => {
      try {
        await ScanbotSdkService.instance.createBarcodeScanner(
          this.onBarcodesDetected.bind(this),
          this.onBarcodeScannerError.bind(this),
        );
      } catch (e) {
        this.onBarcodeScannerError(e);
        this.pop()
      }
    });
  }

  pop() {
    super.pop();
    this.updateAnimationType(AnimationType.Pop, () => {
      ScanbotSdkService.instance.disposeBarcodeScanner();
    });
  }
}
