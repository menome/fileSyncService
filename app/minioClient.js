/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Store the singleton minio client here.
 */
var Minio = require('minio');
var conf = require('./config');

module.exports = new Minio.Client({
  endPoint: conf.get("minio.endPoint"),
  port: conf.get("minio.port"),
  useSSL: conf.get("minio.useSSL"),
  accessKey: conf.get("minio.accessKey"),
  secretKey: conf.get("minio.secretKey")
});