var config = require('./config')
,   request = require('request')
,   ERRORS = config.ERRORS
,   format = require('util').format
,   xtend = require('xtend')

function TmdbApi(key){
    if(!key) throw new Error(ERRORS.KEY_MISSING)
    this.apiKey = key
    this._createMethods('movie', without('movie',Object.keys(config.endpoints.movie)).map(function(val){
        return {name : val, uri : config.endpoints.movie[val] }
    }) )
}

/**
    Generes
    Returns the list of movie genres.
    @sig Genres(function(err,data,response))
    @sig Genres([Integer] Id,function(err,data,response))
    @sig Genres([Integer] Id, [Object] Options, function(err,data,response)) 
    @Desc Fetch all movies with the specified genre.(Note this acheives the same effect as Genres(Integer))
*/
TmdbApi.prototype.genres = function(id,opts,callback) {
    var args = Array.prototype.slice.call(arguments)
    if(args.length === 1){
        callback = id
        id = null
    }else if(args.length === 2){
        callback = opts
        opts = {}
    }else{
        opts = xtend(config.defaultOpts.genres.movies, opts)
    }

    if(null == id){
        return this._execRequest({
            uri : config.baseUrl + config.endpoints.genres.genreList
        }, callback)
    }
    this._execRequest({
        uri : config.baseUrl + format(config.endpoints.genres.movies, id),
        qs : opts
    }, callback)
}

/**
    Generes
    @Desc Get a list of all changed movies,tv or person ids changed. Defaults to movie
    @sig changes(function(err,data,response))
    @sig changes([Object] opts, function(err,data,response))
    @sig changes([String] type, function(err,data,response))
    @sig changes([String] type, opts, function(err,data,response))
*/
TmdbApi.prototype.changes = function(type,opts,callback) {
    var args = Array.prototype.slice.call(arguments)
    callback = args[args.length-1]
    if(args.length === 1){
        opts = {}
        type = 'Movie'
    }else if(args.length === 2){
        if(typeof type === 'string'){
            opts = {}
        }else{
            opts = xtend(defaultOpts,type)
            type = 'Movie'
        }
    }
    return this._execRequest({
        uri : config.baseUrl + format(config.endpoints.changes, type),
        qs : opts
    }, callback)
}

TmdbApi.prototype.collection = function(id,opts,callback) {
    return new Chain(this, this.formUri(format(config.endpoints.collection.collection, id)),['images'],opts,callback)
};

TmdbApi.prototype.movie = function(id,opts,callback) {
    return new Chain(this
        ,this.formUri(format(config.endpoints.movie.movie,id))
        ,without('movie', Object.keys(config.endpoints.movie))
        ,opts
        ,callback)
};
TmdbApi.prototype._createMethods = function(prefix,methodList) {
    methodList.forEach(function(val){
        this[prefix+normalize(val.name)] = this._generic.bind(this,val.uri); 
    },this)
};

TmdbApi.prototype._generic = function(uri,token,opts,callback) {
    if(typeof opts === 'function'){
        callback = opts
        opts = {}
    }
    var uri = this.formUri(format(uri,token))
    this._execRequest({
        uri : uri,
        qs : opts
    }, callback)
};



TmdbApi.prototype.formUri = function(uri) {
    return config.baseUrl + uri
};

TmdbApi.prototype._execRequest = function(opts,callback) {
    if(null == opts.qs) opts.qs = {}
    if(null == opts.method) opts.method = 'GET'
    opts.qs.api_key = this.apiKey
    request(opts,function(err,body,response){
        if(err) return callback(err,response, body, opts, this)
        return callback(err,JSON.parse(response),body, opts, this)
    })
}

function Chain(api,uri,methods,opts,cb){
    this._chain = []
    this._remaining = {}
    this.api = api
    this.opts = {
        uri : uri,
        qs : {}
    }
    methods.forEach(function(v){
        this._remaining[v] = true
        this[v] = this.add.bind(this, v)
    }, this)
    var args = Array.prototype.slice.call(arguments)
    if(typeof opts == 'function'){
        cb = opts
        opts = {}
    }
    if(cb){
        return this.exec(opts,cb)
    }
}

Chain.prototype.add = function(method,opts,cb) {
    if(this._remaining[method] === true){
        this._remaining[method] = false
        this._chain.push(method)
    }
    var args = Array.prototype.slice.call(arguments)
    if(typeof opts == 'function'){
        return this.exec(opts)
    }
    if(typeof cb == 'function'){
        return this.exec(opts,cb)
    }
    return this;
};

Chain.prototype.exec = function(opts,cb) {
    if(typeof opts == 'function') {
        cb = opts
        opts = {}
    }
    this.opts.qs = xtend(this.opts.qs,opts)
    if(this._chain.length > 0){
        this.opts.qs.append_to_response = this._chain.reduce(function(pre,cur,ind){
            return pre + ','+cur
        })
    }
    this.api._execRequest(this.opts,cb)
    this.cleanUp()
    return this
};

Chain.prototype.cleanUp = function() {
    this.opts = {
        uri : this.opts.uri,
        qs : {}
    }
    each(this._remaining, function(v,k){
        this[k] = true
    })
};

function each(obj,cb){
    for(var key in obj){
        if(obj.hasOwnProperty(key)){
            cb.call(obj, obj[key], key)
        }
    }
}

function normalize(s){
    return s[0].toUpperCase() + s.substr(1).toLowerCase()
}

function without(val,array){
    return array.filter(function(v){return v != val})
}


module.exports = TmdbApi
