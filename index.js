require('colors')
// const path = require('path')
const rd = require('rd')
const fs = require('fs')
const Router = require('koa-router')
const parse = require('co-body')
const swaggerJson = require('./lib/swagger/swagger-json')

var routerConfig = []       // 保存所有路由信息
var thisController = {}     // 临时保存遍历到的当前控制器信息
var thisActionCount = 0     // 临时保存当前控制器的Action数量
const router = Router()

module.exports.Router = function ({controllerDir, swagger}) {
  console.info('加载Controllers')
  rd.eachSync(`${controllerDir}`, function (f, s) {
    if (f.lastIndexOf('.js') > -1) {
      require(f).default
    }
  })
  router.jwtUnlessPaths = []
  for (var i = 0; i < routerConfig.length; i++) {
    var config = routerConfig[i]
    console.log(`  ${'--'.grey} ${config.method.bold} ${config.path.grey} `)
    if (config.method === 'ALL') {
      router.all(config.path, config.authFilter, config.jsonBodyHandle, config.fun)
    } else if (config.method === 'GET') {
      router.get(config.path, config.authFilter, config.jsonBodyHandle, config.fun)
    } else if (config.method === 'POST') {
      router.post(config.path, config.authFilter, config.jsonBodyHandle, config.fun)
    }

    if (config.jwtUnless) {
      router.jwtUnlessPaths.push(config.path)
    }
  }
  if (swagger !== undefined && swagger.enable) {
    // 默认值
    // swagger.json = swagger.json || '/swagger/docs.json'    // 不能修改
    swagger.html = swagger.html || '/swagger/docs.html'
    router.jwtUnlessPaths.push(swagger.json)
    router.jwtUnlessPaths.push(swagger.html)

    // 设置 info
    swaggerJson.setInfo({
      title: swagger.title,
      description: swagger.description,
      version: swagger.version
    })

    // 生成json文件
    for (var j = 0; j < routerConfig.length; j++) {
      var config1 = routerConfig[j]
      if (config1.tag !== undefined && config1.summary !== undefined) {
        swaggerJson.addPath({
          url: config1.path,
          method: config1.method,
          summary: config1.summary,
          description: config1.description,
          parameters: config1.parameters,
          responses: config1.responses,
          tag: config1.tag,
          deprecated: config1.deprecated
        })
      }
    }

    // 设置JSON URL
    router.get(swagger.json, async (ctx) => {
      ctx.body = swaggerJson.toJson()
    })
    // 设置页面URL
    router.get(swagger.html, async (ctx) => {
      var data = fs.readFileSync(`${__dirname}/lib/swagger/docs.html`, 'utf8')
      ctx.response.type = 'text/html'
      ctx.body = data
    })
  }
  return router
}

module.exports.Controller = function (value) {
  return (target, key, descriptor) => {
    var path = ''
    var authFilter = defaultFun()
    if (value instanceof Object) {
      path = value.path || path
      if (value.auth !== undefined) {
        authFilter = value.auth
      }
    } else {
      path = value
    }
    thisActionCount = 0
    for (var method in thisController) {
      var item = thisController[method]
      var dec = {
        method: item.method || 'ALL',
        path: `${path}${item.path}`,
        fun: item.fun,
        authFilter: item.authFilter || authFilter,
        jsonBodyHandle: item.jsonBodyHandle || defaultFun()
      }
      // Swagger
      if (item.tag !== undefined) {
        dec.tag = item.tag
      }
      if (item.deprecated !== undefined) {
        dec.deprecated = item.deprecated
      }
      if (item.responses !== undefined) {
        dec.responses = item.responses
      }
      if (item.description !== undefined) {
        dec.description = item.description
      }
      if (item.summary !== undefined) {
        dec.summary = item.summary
      }
      if (item.parameters !== undefined) {
        dec.parameters = item.parameters
      }
      if (item.jwtUnless !== undefined) {
        dec.jwtUnless = item.jwtUnless
      }
      routerConfig.push(dec)
      thisActionCount++
    }
    thisController = {}
    return descriptor
  }
}

module.exports.Action = function (path) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        path: path,
        fun: descriptor.value
      }
    } else {
      thisController[key].path = path
      thisController[key].fun = descriptor.value
    }
    return descriptor
  }
}

module.exports.GetAction = function (path) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        path: path,
        fun: descriptor.value,
        method: 'GET'
      }
    } else {
      thisController[key].path = path
      thisController[key].fun = descriptor.value
      thisController[key].method = 'GET'
    }
    return descriptor
  }
}

module.exports.PostAction = function (path) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        path: path,
        fun: descriptor.value,
        method: 'POST'
      }
    } else {
      thisController[key].path = path
      thisController[key].fun = descriptor.value
      thisController[key].method = 'POST'
    }
    return descriptor
  }
}

module.exports.All = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      method: 'ALL'
    }
  } else {
    thisController[key].method = 'ALL'
  }
}

module.exports.Get = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      method: 'GET'
    }
  } else {
    thisController[key].method = 'GET'
  }
}

module.exports.Post = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      method: 'POST'
    }
  } else {
    thisController[key].method = 'POST'
  }
}

/* Swagger */
module.exports.Swagger = function (value) {
  return (target, key, descriptor) => {
    var name = ''
    var description = ''
    if (value instanceof Object) {
      name = value.name || name
      description = value.description || description
    } else {
      name = value
    }
    if (thisController === {}) {
      for (var i = (routerConfig.length - thisActionCount); i < routerConfig.length; i++) {
        routerConfig[i].tag = {
          name: name,
          description: description
        }
      }
    } else {
      for (var method in thisController) {
        var item = thisController[method]
        item.tag = {
          name: name,
          description: description
        }
      }
    }
    return descriptor
  }
}

module.exports.Parameters = function (array) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        parameters: array
      }
    } else {
      thisController[key].parameters = array
    }
    return descriptor
  }
}

module.exports.Summary = function (str) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        summary: str
      }
    } else {
      thisController[key].summary = str
    }
    return descriptor
  }
}

module.exports.Description = function (str) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        description: str
      }
    } else {
      thisController[key].description = str
    }
    return descriptor
  }
}

module.exports.Responses = function (obj) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key] = {
        responses: obj
      }
    } else {
      thisController[key].responses = obj
    }
    return descriptor
  }
}

module.exports.Deprecated = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      deprecated: true
    }
  } else {
    thisController[key].deprecated = true
  }
}

module.exports.JsonBody = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      jsonBodyHandle: jsonBodyHandle()
    }
  } else {
    thisController[key].jsonBodyHandle = jsonBodyHandle()
  }
}

module.exports.JwtUnless = function (target, key, descriptor) {
  if (thisController[key] === undefined) {
    thisController[key] = {
      jwtUnless: true
    }
  } else {
    thisController[key].jwtUnless = true
  }
}

module.exports.AuthModule = function (value) {
  return (target, key, descriptor) => {
    var name = ''
    var platform = ''
    if (value instanceof Object) {
      name = value.name || name
      platform = value.platform || platform
    } else {
      name = value
    }
    if (thisController === {}) {
      for (var i = (routerConfig.length - thisActionCount); i < routerConfig.length; i++) {
        routerConfig[i].auth = {
          name: name,
          platform: platform
        }
      }
    } else {
      for (var method in thisController) {
        var item = thisController[method]
        item.auth = {
          name: name,
          platform: platform
        }
      }
    }
    return descriptor
  }
}

module.exports.Auth = function (path) {
  return (target, key, descriptor) => {
    if (thisController[key] === undefined) {
      thisController[key].auth = {
        path: path,
        fun: descriptor.value,
        method: 'GET'
      }
    } else {
      thisController[key].path = path
      thisController[key].fun = descriptor.value
      thisController[key].method = 'GET'
    }
    return descriptor
  }
}

/**
 * 没有操作的中间件
 */
var defaultFun = () => {
  return async (ctx, next) => {
    await next()
  }
}

var jsonBodyHandle = () => {
  return async (ctx, next) => {
    let isJson = false
    let contentType = ctx.request.headers['content-type']
    if (contentType !== undefined && contentType.indexOf('json') > -1) {
      isJson = true
    }
    if (!isJson) {
      var opts = {
        detectJSON: undefined,
        onerror: undefined,
        returnRawBody: true,
        limit: undefined
      }
      var res = await parse.json(ctx, opts)
      ctx.request.body = 'parsed' in res ? res.parsed : {}
      if (ctx.request.rawBody === undefined) ctx.request.rawBody = res.raw
    }
    await next()
  }
}
