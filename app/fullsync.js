/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Entry point for running a full sync of the minio bucket to the neo4j db.
 * Connects to minio, gets a list of all files in the bucket, and creates a file for each of them.
 * 
 * TODO: Make this work eventually
 */
var conf = require('./config');
var bot = require('@menome/botframework');
var queryBuilder = require('./queryBuilder');
var minioClient = require('./minioClient');

module.exports = {
  startSync,
  addNodes,
  deleteNodes
}

// Synchronizes the files in the filestore with the DB
// For each file in the filestore, update/create the node in the DB.
// Remove all nodes that weren't updated.
function startSync() {
  bot.logger.info("==Starting Full Sync==");
  var importId = bot.genUuid();
  addNodes(importId, function () {
    deleteNodes(importId);
  });
}

// Adds files from the import.
function addNodes(importId, cb) {
  bot.logger.info("Adding All File Nodes");

  var stream = minioClient.listObjects('filestore', '', true);
  var promises = [];

  stream.on('data', function (obj) {
    bot.logger.info("Found " + obj.name);
    obj.importId = importId;
    var queryObj = queryBuilder.addFileQuery(obj);
    var linkQueries = queryBuilder.fileConnectionQueries(obj);

    promises.push(
      bot.query(queryObj.compile(), queryObj.params())
        .then(function (result) {
          // Then create our links.
          linkQueries.forEach(function (val) {
            if (!val) return;
            bot.query(val.compile(), val.params()).then(function (result) {
              return result;
            })
          })

          return result;
        })
        .catch(function (err) {
          bot.logger.error(err.code);
        })
    );
  });

  stream.on('error', function (err) {
    bot.logger.error(err);
  });

  stream.on('end', function () {
    // When all the promises end, close the driver.
    Promise.all(promises).then(function (result) {
      bot.logger.info("Operations Finished");
      return cb();
    });
  });
}

// Deletes file nodes that were not changed this import.
// The only way this happens is if the files don't exist in the DB any more.
function deleteNodes(importId) {
  bot.logger.info("Removing nodes for Deleted files");

  bot.query("MATCH (f:File:Card) WHERE f.ImportId <> {importId} DETACH DELETE f", {
      importId: importId
    })
    .then(function (result) {
      bot.logger.info("Deleted " + result.summary.updateStatistics.nodesDeleted() + " nodes.")
    })
    .catch(function (err) {
      bot.logger.error(err);
    })
}