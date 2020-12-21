/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

const SKETCHFAB_API_URL = 'https://api.sketchfab.com/v3/models/MODEL/download'

const zip = require('./lib/zip.js').zip;
window.zip = zip;
require('./lib/zip-ext.js') 
zip.Inflater = require('./lib/inflate.js').Inflater
//zip.workerScriptsPath = '../../lib/';
zip.useWebWorkers = false 
/*
zip.workerScripts = {
  deflater: ['./lib/z-worker.js', './lib/deflate.js'],
  inflater: ['./lib/z-worker.js', './lib/inflate.js'],
};
*/

//https://sketchfab.com/developers/download-api/downloading-models/javascript

/**
 * Sketchfab component for A-Frame.
 */
AFRAME.registerComponent('sketchfab', {
  schema: {
    token: {
      default: ''
    },
    src: {
    },
    normalize: {
      type: 'boolean',
      default: true
    }
  },

  multiple: false,

  init: function () {
    this.model = null;
    this.loadSketchfabModel = this.loadSketchfabModel.bind(this)
  },

  update: function (oldData) { 
  
    const el = this.el
    const data = this.data;

    if (!data.src || !data.token) return; 

    this.remove()

    this.getGLTFUrl(data.src, data.token)
      .then(this.loadSketchfabModel)
      .then(gltfModel => {


        console.log('loaded', gltfModel)
        this.model = gltfModel.scene || gltfModel.scenes[0]
        this.model.animations = gltfModel.animations

        el.setObject3D('mesh', this.model)
        //el.emit('model-loaded', {format: 'gltf', model: this.model})
        if (data.normalize) {
          this.normalize()
        }
        el.emit('model-loaded')

      })
      .catch(err => {

        console.error('ERROR loading Sketchfab model from "' + data.src +'" : ' + err)
        el.emit('model-error', err)

      })
  
  },

  normalize: function() {
    const el = this.el;
    const mesh = el.getObject3D('mesh');


    //Normalize scene scale
    var TARGET_SIZE = 1;
    var bbox = new THREE.Box3().setFromObject(mesh);
    var maxSide = Math.max(
        bbox.max.x - bbox.min.x,
        bbox.max.y - bbox.min.y,
        bbox.max.z - bbox.min.z
    );
    var ratio = TARGET_SIZE / maxSide;
    mesh.scale.set(ratio, ratio, ratio);

    //Center scene
    var centerX = bbox.min.x * ratio * -1 - (bbox.max.x - bbox.min.x) / 2 * ratio;
    var centerY = bbox.min.y * ratio * -1;
    var centerZ = bbox.min.z * ratio * -1 - (bbox.max.z - bbox.min.z) / 2 * ratio;
    mesh.translateX(centerX);
    mesh.translateY(centerY);
    mesh.translateZ(centerZ);

    console.log(ratio, centerX, centerY, centerZ)
    return;

    const span = 1;
    const offset = new THREE.Vector3(); // data.offset?

    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    position.copy(el.object3D.position);
    scale.copy(el.object3D.scale);
    el.object3D.scale.set(1, 1, 1);
    el.object3D.position.set(0, 0, 0);

    el.object3D.updateMatrixWorld(true);

    // https://github.com/mrdoob/three.js/blob/master/src/core/Geometry.js#L367
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    const boundingSphere = new THREE.Sphere();
    box.getBoundingSphere(boundingSphere);
    const center = boundingSphere.center;
    const radius = boundingSphere.radius;

    const s = (radius === 0 ? 1 : 1.0 / radius) * span;

    mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.scale(s, s, s);
        child.geometry.translate(-s * center.x + offset.x, -s * center.y + offset.y, -s * center.z + offset.z);
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    });
    el.object3D.scale.copy(scale);
    el.object3D.position.copy(position);
    el.object3D.updateMatrixWorld(true);
    console.log('norm', s, box, center, radius)
  },

  _remove: function () {
    if (this.model) this.el.removeObject3D('mesh')
  },

  remove: function () {
    this._remove();
  },

  getGLTFUrl: function(id, token) {
    const url = SKETCHFAB_API_URL.replace(/MODEL/,  id);
    const options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        mode: 'cors'
    };

    return fetch(url, options).then((response) => {

      return response.json().catch((error) => {
        // handle JSON parsing error
        console.log('ERROR parsing Sketchfab server response JSON.\nRequested Model: "' + url + '"\nError: "' + JSON.stringify(error) + '"')
        return Promise.reject('Sketchfab API server error. Check console for details.')
      }).then((data) => {
        if (!data.gltf.url) {
          return Promise.reject('Sketchfab API error', data)
        }
        console.log('loaded url', data)
        return {...data.gltf}
      })

    })
  },
  loadSketchfabModel: function(data) {
    const url = data.url;
    const size = data.size;

    return new Promise( (resolve, reject) => {
      this.download(url).then(assetMap => {
        const loader = new THREE.GLTFLoader()
        const _url = assetMap.modifiedAssets[assetMap.url]
        loader.load(_url, resolve)
      })
    })
  },
  download: function(url) {
    // https://labs.sketchfab.com/experiments/download-api/

    return new Promise( (resolve, reject) => {
            var assetMap = {};
            var gltfUrl = 'scene.gltf';
            this._readZip( url)
                .then(
                    (entries) =>  {
                        return this._parseZip(entries);
                    }
                )
                .then((assetMap) => {
                    resolve(assetMap);
                })
                .catch(reject);
        }
    );

    /*
    const manager = new THREE.LoadingManager();
    return new Promise((resolve, reject) => {

      const zipLoader = new THREE.ZipLoader()
      //loader.setResponseType( 'arraybuffer' )
      zipLoader.load(url).then(file => {
        manager.setURLModifier(file.urlResolver);
        const item = resolve(file.find( /\.(gltf|glb)$/i )[ 0 ] );
        console.log('zip loaded', file, item)
        resolve(item);

      }).then(file => {
        console.log('file loaded', file)
        const gltfLoader = new THREE.GLTFLoader(manager)
        gltfLoader.load(file, (gltf) => {

           console.log('gltf loaded', gltf)
            resolve(gltf)
        })
      })
    })
    */
  },

  _readZip: function(url) {
        return new Promise((resolve, reject) => {
            var reader = new zip.HttpReader(url);
            zip.createReader(
                reader,
                (zipReader) => {
                    zipReader.getEntries(resolve);
                },
                reject
            );
        });
    },

    _parseZip: function(entries) {
        const _parseZip = (resolve, reject) => {
            var url;
            var entry;
            var promises = [];
            var completedPromises = 0;
            var promise;

            for (var i = 0, l = entries.length; i < l; i++) {
                entry = entries[i];

                if (entry.directory === true) {
                    continue;
                }

                if (entry.filename.match(/\.gltf$/)) {
                    url = entry.filename;
                }

                promise = this._saveEntryToBlob(
                    entry,
                );

                promise.then((result) => {
                    completedPromises++;
                    return result;
                });

                promises.push(promise);
            }

            if (!url) {
                return reject('Can not find a .gltf file');
            }

            var blobsReady = Promise.all(promises);
            blobsReady.then((blobs) => {

                var assets = blobs.reduce((acc, cur) => {
                    acc[cur.name] = cur.url;
                    return acc;
                }, {});

                var shouldRewriteAssetsURLs = true;

                if (shouldRewriteAssetsURLs) {
                    var assetsPromise = this._rewriteAssetURLs(assets, url, blobs);
                    assetsPromise.then((modifiedAssets) => {
                        resolve({
                            assets: assets,
                            originalAssets: Object.assign({}, assets),
                            modifiedAssets: modifiedAssets,
                            url: url
                        });
                    });
                } else {
                    resolve({
                        assets: assets,
                        originalAssets: Object.assign({}, assets),
                        modifiedAssets: null,
                        url: url
                    });
                }
            })
        }

        return new Promise(_parseZip);
    },

    _rewriteAssetURLs: function(assets, gltfPath, blobs) {
        return new Promise((resolve, reject) => {
            var newAssets = Object.assign({}, assets);
            var reader = new FileReader();

            var gltfBlob = blobs.reduce((acc, cur) => {
                if (cur.name === gltfPath) {
                    return cur;
                }
                return acc;
            }, null);

            if (!gltfBlob) {
                return reject('Cannot rewrite glTF (glTF not found)');
            }

            reader.onload = () => {
                try {
                    var json = JSON.parse(reader.result);

                    // Replace original buffers and images by blob URLs
                    if (json.hasOwnProperty('buffers')) {
                        for (var i = 0; i < json.buffers.length; i++) {
                            json.buffers[i].uri = newAssets[json.buffers[i].uri];
                        }
                    }

                    if (json.hasOwnProperty('images')) {
                        for (var i = 0; i < json.images.length; i++) {
                            json.images[i].uri = newAssets[json.images[i].uri];
                        }
                    }

                    var fileContent = JSON.stringify(json, null, 2);
                    var updatedBlob = new Blob([fileContent], { type: 'text/plain' });
                    var gltfBlobUrl = window.URL.createObjectURL(updatedBlob);
                    newAssets[gltfPath] = gltfBlobUrl;
                    resolve(newAssets);
                } catch (e) {
                    reject('Cannot parse glTF file', e);
                }
            };
            reader.readAsText(gltfBlob.blob);
        });
    },

    _saveEntryToBlob: function(entry) {
        return new Promise((resolve, reject) => {
            entry.getData(
                new zip.BlobWriter('text/plain'),
                (data) => {
                    var url = window.URL.createObjectURL(data);
                    resolve({
                        name: entry.filename,
                        url: url,
                        blob: data
                    });
                },
            );
        });
    }
});



