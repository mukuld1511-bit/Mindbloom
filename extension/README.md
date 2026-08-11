# MindBloom Chrome Extension (Manifest V3)

A lightweight Manifest V3 Chrome Extension that captures articles or highlighted text from any webpage and sends it directly to your MindBloom local ML backend.

## Design Aesthetic
- Matches MindBloom Notebook theme (`#FAFAF8` paper canvas, `#1C1B19` ink text, `#3D5A45` muted green accent, `#E4E1D8` hairline borders).
- Pure vanilla JavaScript — no heavy npm packages or build steps required.

## Installation Instructions (Load Unpacked)

1. Open **Google Chrome**, **Brave**, or **Microsoft Edge**.
2. Navigate to `chrome://extensions` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button.
5. Select the `extension/` directory from this project repository.
6. The **MindBloom** sprout icon will appear in your browser toolbar!

## Usage

1. **Selection Capture**: Highlight any passage of text on a web page, right-click, and select *"Send selection to MindBloom"*, or click the extension popup and hit *"Send Selection to MindBloom"*.
2. **Page Capture**: Click the MindBloom extension icon in your toolbar, then click *"Send Page Article to MindBloom"* to automatically extract the main article content.
3. **Configure Server**: Right-click the extension icon -> **Options** (or click the gear icon in the popup) to test and save your custom MindBloom server URL (default `http://localhost:3000`).
