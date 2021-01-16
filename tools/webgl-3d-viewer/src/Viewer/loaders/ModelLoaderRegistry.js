import ldFirst from "lodash/array/first";
import ldFilter from "lodash/collection/filter";
import md5 from "blueimp-md5";

import Loader from "./STLLoader";

export default class ModelLoaderRegistry {
  get registry() {
    return ModelLoaderRegistry.modelRegistry;
  }

  load(
    url,
    onLoad = () => {},
    onProgress = () => {},
    onError = () => {},
    onParseStart = () => {},
    onParseEnd = () => {}
  ) {
    const id = this._genId(url);
    const regEntry = this._findEntryById(id);

    if (regEntry) {
      let geometry = regEntry.geometry;
      geometry.registry = true;

      onParseStart();
      onLoad(regEntry.geometry);
      onParseEnd();
      onProgress({ loaded: 100, total: 100 });
    } else {
      const loader = new Loader();

      loader.load(
        url,
        (geometry) => {
          geometry.registry = false;

          const RegistryItem = {
            id: id,
            geometry: geometry,
          };

          this.registry.push(RegistryItem);
          onLoad(geometry);
        },
        onProgress,
        onError,
        onParseStart,
        onParseEnd
      );
    }
  }

  parse(model) {
    const id = this._genId(model);
    const regEntry = this._findEntryById(id);
    let geometry = null;

    if (regEntry) {
      geometry = regEntry.geometry;
      geometry.registry = true;
    } else {
      const loader = new Loader();
      const content = loader.parse(model);

      const RegistryItem = {
        id: id,
        geometry: content,
      };

      this.registry.push(RegistryItem);
      geometry = content;
      geometry.registry = true;
    }

    return geometry;
  }

  _findEntryById(id) {
    const entry = ldFirst(ldFilter(this.registry, { id: id }));

    if (entry) {
      return Object.assign({}, entry);
    }
  }

  _genId(base) {
    let id = "";

    if (base instanceof ArrayBuffer) {
      // ConvertBufferToBase64
      const bufferBase64 = btoa(
        [].reduce.call(
          new Uint8Array(base),
          function (p, c) {
            return p + String.fromCharCode(c);
          },
          ""
        )
      );
      id = md5(bufferBase64, "arraybuffer");
    } else {
      id = md5(base, "url");
    }

    return id;
  }
}

ModelLoaderRegistry.modelRegistry = [];
