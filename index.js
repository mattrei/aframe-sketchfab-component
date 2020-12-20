/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

const SKETCHFAB_API_URL = 'https://api.sketchfab.com/v3/models/MODEL/download'

const THREEZipLoader = require('three-ziploader')

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
  },

  update: function (oldData) { 
  
    const el = this.el
    const data = this.data;

    if (!data.src || !data.token) return; 

    this.remove()

    this.getGLTFUrl(data.src, data.token)
      .then(this.loadSketchfabModel)
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

        console.error('ERROR loading Sketchfab model from "' + data.src +'" : ' + err)
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

  getGLTFUrl: function(id, token) {
    const url = SKETCHFAB_API_URL.replace(/MODEL/,  id);

        // Configure Header
        var options = {
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
          return {...data.gltf}
        })

      })
  },
  loadSkechfabModel: function(data, onProgress) {
    const url = data.url;
    const size = data.size;
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);


    const manager = new THREE.LoadingManager();


    return new Promise((resolve, reject) => {

      const zipLoader = new THREE.ZipLoader()
      //loader.setResponseType( 'arraybuffer' )
      zipLoader.load(url).then(file => {
        console.log('zip loaded', file)
        manager.setURLModifier(file.urlResolver);
        const item = resolve(zip.find( /\.(gltf|glb)$/i )[ 0 ] );

        const gltfLoader = new THREE.GLTFLoader(manager)
        gltfLoader.load(file, (gltf) => {

           console.log('gltf loaded', gltf)
            resolve(gltf)
        })
      })
    })
  }
});



