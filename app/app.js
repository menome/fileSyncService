/** 
 * Copyright (C) 2017 Menome Technologies Inc.  
 * 
 * A small service that is built to sync the contents of an S3/Minio bucket with a structure of nodes in Neo4j.
 * For use with theLink.
 */
"use strict";
var bot = require('@menome/botframework')
var config = require('./config.js');
var fullsync = require('./fullsync'); // For doing full file sync with minio
var articler = require('./articler');
var rabbitListener = require('./rabbitListener'); // For listening to AMQP messages

// We only need to do this once. Bot is a singleton.
bot.configure({
  name: "File Sync Service",
  desc: "Updates the graph based on events from Minio",
  logging: config.get('logging'),
  port: config.get('port'),
  rabbit: config.get('rabbit'),
  neo4j: config.get('neo4j')
});

// Register our sync endpoint.
bot.registerEndpoint({
  "name": "Full Sync",
  "path": "/fullsync",
  "method": "POST",
  "desc": "Syncs the graph with the current Minio contents."
}, function(req,res) {
  res.status(501).send("Not yet Implemented.")
  // fullsync.startSync();
});

// Register our addURL endpoint
bot.registerEndpoint({
  "name": "Articler",
  "path": "/addurl",
  "method": "POST",
  "desc": "Takes 'url' as a parameter. Merges the contents of the URL into the graph as an article"
}, function (req, res) {
  bot.logger.info("Adding URL:" + "<" + req.body["url"] + ">");
  //article info json blob
  articler.addArticle(JSON.stringify(req.body["url"])).then((err) => {
    if (err) return res.status(500).send("Failed to add Article")
    return res.status(200).send("Article Added")
  })
});

// Listen on the Rabbit bus.
bot.rabbitSubscribe('fss_queue',rabbitListener.handleMessage);

// Start the bot.
bot.start();
bot.changeState({state: "idle"})