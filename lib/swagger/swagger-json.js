var data = {
  swagger: '2.0',
  info: {
    title: '',
    description: '',
    version: '1.0.0'
  },
  // basePath: '/',
  paths: {},
  // responses: {},
  definitions: {},
  tags: [],
  securityDefinitions: {
    api_key: {
      type: 'apiKey',
      in: 'header',
      name: 'api_key'
    }
  }
}

function _addTag(tag) {
  var flag = true
  for (var k1 in data.tags) {
    var t1 = data.tags[k1]
    if (t1.name === tag.name) {
      flag = false
      break
    }
  }
  if (flag) {
    data.tags.push(tag)
  }
}

module.exports.setInfo = function ({title, description, version}) {
  data.info.title = title
  data.info.description = description
  data.info.version = version
}

module.exports.addPath = function ({url, method, summary, description, parameters, responses, tag, deprecated = false}) {
  // 初始值
  if (summary === undefined) {
    summary = ''
  }
  if (description === undefined) {
    description = ''
  }
  if (parameters === undefined) {
    parameters = []
  }
  if (responses === undefined) {
    responses = {'200': {description: 'ok'}}
  }
  if (deprecated === undefined) {
    deprecated = false
  }
  _addTag(tag)
  var tags = [tag.name]

  var hasConsumes = false
  var params = []
  for (var k1 in parameters) {
    var p = parameters[k1]
    if (p.in === 'query' || p.in === 'path' || p.in === 'header') {
      params.push({
        name: p.name,
        type: p.type,
        required: p.required,
        default: p.default,
        description: p.description,
        in: p.in      // query  path
      })
    } else if (p.in === 'body') {
      params.push({
        name: p.name,
        description: p.description,
        schema: {
          type: 'object',
          properties: p.schema
        },
        in: p.in      // body
      })
    } else if (p.in === 'formData') {
      params.push({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        in: p.in      // formData
      })
      hasConsumes = true
    }
  }
  var content = {
    summary,
    description,
    parameters: params,
    responses,
    tags,
    operationId: `o${Date.now()}`,
    consumes: ['application/json'],
    produces: ['*/*']
  }
  if (hasConsumes) {
    content.consumes = ['multipart/form-data']
  }
  if (deprecated) {
    content.deprecated = true
  }
  data.paths[url] = {}
  if (method === 'GET') {
    data.paths[url]['get'] = content
  } else if (method === 'POST') {
    data.paths[url]['post'] = content
  } else if (method === 'ALL') {
    data.paths[url]['get'] = content
    data.paths[url]['post'] = content
  }
}

module.exports.toJson = () => {
  return data
}
