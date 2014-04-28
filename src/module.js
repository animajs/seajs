/**
 * module.js - The core of module loader
 */

var cachedMods = seajs.cache = {}

function Module(uri, deps) {
  this.uri = uri
  this.dependencies = deps || []
}

// Execute a module
Module.prototype.exec = function () {
  var mod = this

  // When module is executed, DO NOT execute it again. When module
  // is being executed, just return `module.exports` too, for avoiding
  // circularly calling
  if (mod.exports !== undefined) {
    return mod.exports
  }

  // Create require
  var uri = mod.uri

  function require(id) {
    return Module.get(id).exec()
  }

  require.resolve = function(id) {
    return id
  }

  require.async = function(ids, callback) {
    Module.use(ids, callback, uri + "_async_" + cid())
    return require
  }

  // Exec factory
  var factory = mod.factory

  var exports = isFunction(factory) ?
      factory(require, mod.exports = {}, mod) :
      factory

  if (exports === undefined) {
    exports = mod.exports
  }

  // Reduce memory leak
  delete mod.factory

  mod.exports = exports

  return exports
}

// Define a module
Module.define = function (id, deps, factory) {
  var argsLen = arguments.length

  // define(factory)
  if (argsLen === 1) {
    factory = id
    id = undefined
  }
  else if (argsLen === 2) {
    factory = deps

    // define(deps, factory)
    if (isArray(id)) {
      deps = id
      id = undefined
    }
    // define(id, factory)
    else {
      deps = undefined
    }
  }

  id = id || ''
  var meta = {
    id: id,
    uri: id,
    deps: deps,
    factory: factory
  }

  Module.save(meta.uri, meta)
}

// Save meta data to cachedMods
Module.save = function(uri, meta) {
  var mod = Module.get(uri)

  mod.id = meta.id || uri
  mod.dependencies = meta.deps || []
  mod.factory = meta.factory
}

// Get an existed module or create a new one
Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}

// Use function is equal to load a anonymous module
Module.use = function (ids, callback, uri) {
  var mod = Module.get(uri, isArray(ids) ? ids : [ids])

  mod.callback = function() {
    var exports = []
    var uris = mod.dependencies

    for (var i = 0, len = uris.length; i < len; i++) {
      exports[i] = cachedMods[uris[i]].exec()
    }

    if (callback) {
      callback.apply(global, exports)
    }

    delete mod.callback
  }

  mod.callback()
}


// Public API

seajs.use = function(ids, callback) {
  Module.use(ids, callback, data.cwd + "_use_" + cid())
  return seajs
}

Module.define.cmd = {}
global.define = Module.define


// For Developers

seajs.Module = Module
data.cid = cid

seajs.require = function(id) {
  var mod = Module.get(id)
  mod.exec()
  return mod.exports
}

