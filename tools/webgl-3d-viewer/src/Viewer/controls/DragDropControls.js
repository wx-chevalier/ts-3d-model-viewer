export default class ModelControls {
  constructor(container, onData = () => {}) {
    this.container = container;
    this._onData = onData;

    this._addListener();
  }

  _addListener() {
    this._dropListener = (evt) => {
      this._onDrop(evt);
    };
    this._dragOverListener = (evt) => {
      return evt.preventDefault();
    };

    const container = this.container;
    container.addEventListener("drop", this._dropListener, false);

    // for Firefox
    container.addEventListener("dragover", this._dragOverListener, false);
  }

  _removeListener() {
    const container = this.container;

    container.removeEventListener("drop", this._dropListener, false);
    container.removeEventListener("dragover", this._dragOverListener, false);
  }

  _onDrop(evt = { dataTransfer: { files: [] } }) {
    evt.stopPropagation(); // Stops some browsers from redirecting.
    evt.preventDefault();

    const files = evt.dataTransfer.files;

    let onLoaded = (evt) => {
      this._onData(evt.srcElement.result);
    };

    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      // Read the File objects in this FileList.
      // console.log(f.name + " - " + f.type)
      if (/.*\.stl$/i.test(f.name)) {
        let reader = new FileReader();

        // Closure to capture the file information.
        reader.onloadend = onLoaded;

        reader.readAsArrayBuffer(f);
      }
    }
  }

  destroy() {
    this._removeListener();
    this._onData = null;
  }
}
