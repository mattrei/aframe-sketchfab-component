/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

const POLY_API_URL = 'https://poly.googleapis.com/v1/assets/'

const THREEZipLoader = require('three-ziploader')

/**
 * Google Poly component for A-Frame.
 */
AFRAME.registerComponent('sketchfab', {
  schema: {
    apiKey: {
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
  },

  update: function (oldData) { 
  
    const el = this.el
    const data = this.data;

    if (!data.src || !data.apiKey) return; 

    this.remove()

    this.getGLTFUrl(data.src, data.apiKey)
      .then(this.loadPolyModel)
      .then(gltfModel => {

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

        console.error('ERROR loading Google Poly model from "' + data.src +'" : ' + err)
        el.emit('model-error', err)

      })
  
  },

  normalize: function() {
    const el = this.el;
    const mesh = el.getObject3D('mesh');

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
  },

  _remove: function () {
    if (this.model) this.el.removeObject3D('mesh')
  },

  remove: function () {
    this._remove();
  },

  getGLTFUrl: function(id, apiKey) {
    const url = POLY_API_URL + id + '/?key=' + apiKey;

    // try cache
     /*
    var getUrlPromise = promiseCache.get(url)
    if (!getUrlPromise) {
*/
      return fetch(url).then(function (response) {

        // parse response
        return response.json().catch((error) => {
          // handle JSON parsing error
          console.log('ERROR parsing Google Poly API server response JSON.\nRequested Model: "' + url + '"\nError: "' + JSON.stringify(error) + '"')
          return Promise.reject('Google Poly API server error. Check console for details.')
        }).then((info) => {
          if (info.error !== undefined) {
            return Promise.reject('Poly API error: ' + info.error.message)
          }
          const format = info.formats.find( format => format.formatType === 'GLTF' || format.formatType === 'GLTF2' );
          if ( format ) {
            const r = info.presentationParams.orientingRotation;
            const quaternion = new THREE.Quaternion(r.x || 0, r.y || 0, r.z || 0, r.w || 1);
            return {url: format.root.url, quaternion: quaternion, format: format.formatType}
          } else {
            return Promise.reject('Poly asset id:' + id + ' not provided in GLTF or GLTF2 format.')
          }
        })

      })

    /*
      // add to cache
      promiseCache.add(url, getUrlPromise)

    }

    return getUrlPromise
    */

  },
  loadPolyModel: function(data, onProgress) {
    const url = data.url;
    const quaternion = data.quaternion;
    const format = data.format;
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

    return new Promise((resolve, reject) => {

      const loader = new THREE.FileLoader()
      loader.setResponseType( 'arraybuffer' )
      loader.load( url, data => {
        try {
          console.log('loading', url, format)
          const gltfLoader = format === 'GLTF' ? new THREE.LegacyGLTFLoader() : new THREE.GLTFLoader();
          const path = THREE.LoaderUtils.extractUrlBase(url)

          gltfLoader.parse( data, path, gltf => {
            gltf.scene.traverse(function (child) {
              if (format === 'GLTF' && child.material) child.material = new THREE.MeshStandardMaterial({ vertexColors: THREE.VertexColors })
              if (child.geometry) child.geometry.applyMatrix(matrix);
            })
            resolve(gltf);
          }, reject)

        } catch ( e ) {
          console.error(e)

          // For SyntaxError or TypeError, return a generic failure message.
          reject( e.constructor === Error ? e : new Error( 'THREE.GLTFLoader: Unable to parse model.' ) )

        }

      }, onProgress, reject )

    })
  }

});



