## aframe-google-poly-component

[![Version](http://img.shields.io/npm/v/aframe-google-poly-component.svg?style=flat-square)](https://npmjs.org/package/aframe-google-poly-component)
[![License](http://img.shields.io/npm/l/aframe-google-poly-component.svg?style=flat-square)](https://npmjs.org/package/aframe-google-poly-component)

A Google Poly component for A-Frame.

For [A-Frame](https://aframe.io).

### API

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| apiKey | Google Poly API Key |               |
| src | Google Poly Model Identifier |               |
| normalize | Scale the geometry to a unit of 1 and translate the geometry to `0 0 0` | `true` |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/1.0.4/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-google-poly-component@1.0.0/dist/aframe-google-poly-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity google-poly="foo: bar"></a-entity>
  </a-scene>
</body>
```

#### npm

Install via npm:

```bash
npm install aframe-google-poly-component
```

Then require and use.

```js
require('aframe');
require('aframe-google-poly-component');
```

#### Credits
The code is heavily inspired by the [A-Frame GBlock Component](https://github.com/archilogic-com/aframe-gblock)! Thanks for that!
