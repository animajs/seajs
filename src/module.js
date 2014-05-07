/**
 * module.js - The core of module loader
 */

var cachedMods = {}

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
define = function (id, deps, factory) {
  var meta = {
    id: id,
    deps: deps,
    factory: factory
  }

  Module.save(meta)
}

// Save meta data to cachedMods
Module.save = function(meta) {
  var mod = Module.get(meta.id)

  mod.id = meta.id
  mod.dependencies = meta.deps
  mod.factory = meta.factory
}

// Get an existed module or create a new one
Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}

// Use function is equal to load a anonymous module
Module.use = function (ids, callback, uri) {
  var mod = Module.get(uri, isArray(ids) ? ids : [ids])

  var exports = []
  var uris = mod.dependencies

  for (var i = 0, len = uris.length; i < len; i++) {
    exports[i] = cachedMods[uris[i]].exec()
  }

  if (callback) {
    callback.apply(global, exports)
  }

}

// Public API

require = function(ids, callback) {
  if(callback) {
    Module.use(ids, callback, cwd + "_use_" + cid())
    return require
  }
  else {
    var mod = Module.get(ids)
    if(mod.exports === undefined) {
      mod.exec()
    }
    return mod.exports
  }
}