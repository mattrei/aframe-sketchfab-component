## aframe-sketchfab-component

[![Version](http://img.shields.io/npm/v/aframe-sketchfab-component.svg?style=flat-square)](https://npmjs.org/package/aframe-sketchfab-component)
[![License](http://img.shields.io/npm/l/aframe-sketchfab-component.svg?style=flat-square)](https://npmjs.org/package/aframe-sketchfab-component)

A Sketchfab component for A-Frame.

For [A-Frame](https://aframe.io).

### API

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| apiKey | Sketchfab API Key |               |
| src | Sketchfab Model Identifier |               |
| normalize | Scale the geometry to a unit of 1 and translate the geometry to `0 0 0` | `true` |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/1.1.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-sketchfab-component@1.0.0/dist/aframe-sketchfab-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity sketchfab="foo: bar"></a-entity>
  </a-scene>
</body>
```

#### npm

Install via npm:

```bash
npm install aframe-sketchfab-component
```

Then require and use.

```js
require('aframe');
require('aframe-sketchfab-component');
```
