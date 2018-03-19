/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Takes a file. Does stuff to it to link it to other cards.
 */
var conf = require('./config');
var bot = require('@menome/botframework');
var minioClient = require('./minioClient');
var queryBuilder = require('./queryBuilder');
var textract = require('textract');
var mime = require('mime-types');
var filepreview = require('filepreview');
var crypto = require('crypto');
var os = require('os');   
var fs = require('fs');
var path = require('path');
var util = require('util');
var exec = require('child_process').execFile

module.exports = {
  linkFile,
}

var textGenerationMimeBlacklist = ['image/png', 'image/jpeg', 'image/gif'];
var thumbnailMimeTypes = ['image/jpeg','image/gif','image/png', 'application/pdf', 'application/msword'];

// Determines which link operations to run on the file.
function linkFile(event, uuid) {
  //TODO: This is a necessary hack because minio apparently doesn't take object keys for fgetobject. It takes non-escaped object names.
  var bucket = event.Records[0].s3.bucket.name;
  var key = event.Records[0].s3.object.name.replace(bucket+"/","");
  var uri = event.Key;
  var buffs = [];
  var tmpPath = path.join(os.tmpdir(), 'fss_file_' + bot.genUuid() + key.substr(key.lastIndexOf('.')));

  return new Promise(function(resolve,reject) {
    // Download the file to a temp location. To be deleted when we finish.
    minioClient.fGetObject(bucket, key, tmpPath, function(err) {
      if (err) { return reject(err) }
      var actions = [];

      //check if the file is corrupt
      checkCorrupt(tmpPath, uri)
      .then(function(isCorrupt){
        actions.push(getChecksum(tmpPath, uri));
        if(!isCorrupt){
          actions.push(generateThumbnail(mime.lookup(uri), tmpPath, uri, uuid));
          actions.push(extractSummaryText(mime.lookup(uri), tmpPath, uri));
        }else{
          actions.push(markCorrupt(uri));
        }
      }).then(function(){
        // Wait for all actions to finish.
        Promise.all(actions)
        .then(function(result) {
          fs.unlink(tmpPath, function() {resolve();});
          return deleteFromMinio(uri, bucket, key)
        })
        .catch(function(error) {
          bot.logger.error("Operation failed: %s", error.message);
          fs.unlink(tmpPath, function() {resolve();});
        });
      })
    })
  });
}

// Gets a SHA256 Checksum of the file.
function getChecksum(file, uri) {
  var hash = crypto.createHash("sha256"); //Hash of file
  return new Promise(function(resolve) {
    // Get the checksum here.
    var s = fs.ReadStream(file);
    s.on('data', function(d) { hash.update(d); });
    s.on('end', function() {
      var checksum = hash.digest('base64');
      var addChecksumQuery = queryBuilder.addChecksumQuery(uri,checksum);
      bot.query(addChecksumQuery.compile(),addChecksumQuery.params())
        .then(function(result) {
          bot.logger.info("Added checksum for file: '%s'", uri);
          return resolve(result);
        })
        .catch(function(err) {
          bot.logger.error("Could not add checksum for file '%s': %s", uri, err.message);
          resolve(err);
        })
    });
  })
}

// Extracts summary text from file
function extractSummaryText(mimetype, file, uri) {
  if(textGenerationMimeBlacklist.indexOf(mimetype) === -1) {
    bot.logger.info("Attempting Text Extraction for summarization from file '%s'", uri)

    return new Promise(function(resolve) {
      textract.fromFileWithMimeAndPath(mimetype, file, function( error, text ) {
        if(error) return resolve(error);
        // Generate the fullText query
        // Truncate the text to just under 32k or Lucene will die a horrible death.
        var addTextQuery = queryBuilder.addFullTextQuery(uri,text.substr(0,30000));

        // If it worked, add the fulltext to the node, then add the summary
        bot.query(addTextQuery.compile(),addTextQuery.params())
          .then(function(result) {
            bot.logger.info("Added fulltext for file: '%s'", uri);
            return resolve(result);
          })
          .catch(function(err) {
            bot.logger.error("Could not add fulltext for file '%s': %s", uri, err.message);
            resolve(err);
          })
      })
    });
  }
  else {
    bot.logger.info("Not a fulltext-extractable MIME type. Skipping.")
    return Promise.resolve();
  }
}


// Gets a thumbnail for the file.
function generateThumbnail(mimetype, file, uri, uuid) {
  // if(thumbnailMimeTypes.indexOf(mimetype) !== -1) {
    bot.logger.info("Attempting thumb Extraction for file '%s'", uri)
    var thumbnailPath = file+'-thumbnail.jpg';
    // var filePath = mimetype === 'application/pdf' ? file+'\[0\]' : file;

    var options = {
      width: 400, quality: 90
    }

    console.log(file)
    return new Promise((resolve,reject) => {
      filepreview.generate(file,thumbnailPath,options,(err) => {
        if(err) reject(err);

        minioClient.fPutObject('card-thumbs',uuid+'.jpg', thumbnailPath, "image/jpeg", function(err,etag) {
          if(err) return reject(err);
          //We'll remove the generated thumbnail locally
          fs.unlink(thumbnailPath, function(err) {if(err) bot.logger.error(err)});
          
          var profileImageUri= 'card-thumbs/' + uuid +'.jpg';
          // Set Thumbnail=true on the node to get the thumbnail displaying properly.
          var enableThumbQuery = queryBuilder.addThumbnailQuery(uri, profileImageUri)
          return bot.query(enableThumbQuery.compile(),enableThumbQuery.params()).then(function(result) {
            bot.logger.info("Enabled thumbnail for file: '%s'", uri);
            return resolve(result);
          }).catch(function(err) {
            bot.logger.error("Could not enable thumbnail for file '%s': %s", uri, err.message);
            markCorrupt(uri);
            return resolve(err);
          })
        });
      })
    }).catch(function(err) {
      bot.logger.error("Could not enable thumbnail for file '%s': %s", uri, err.message);
      return err;
    })
    
  return Promise.resolve();
}

function checkCorrupt(tmpPath, file) {
  return new Promise(function(resolve,reject) {
    var extention = mime.lookup(file);
    bot.logger.info("File: " + file + "\nMime = " + extention);
    if(extention.indexOf("pdf") !== -1){
      var args = ['--mime-type']
      args.push(tmpPath)
      var child = exec('file', args, function(err, stdout, stderr) {
        if(err) return reject(err);
        if(stdout.indexOf('octet') !== -1){
          resolve(true);
        }else{
          resolve(false);
        }
      })
    }else{
      resolve(false);
    }
  })
}

function markCorrupt(uri){
  var setCorruptFlagQuery = queryBuilder.setCorruptFlagQuery(uri);
  return bot.query(setCorruptFlagQuery.compile(),setCorruptFlagQuery.params())
    .then(function(result) {
      bot.logger.info("Marked file: '%s' corrupt", uri);
      return result;
    })
    .catch(function(err) {
      bot.logger.error("Could not add corrupt flag for file '%s': %s", uri, err.message);
      return err;
    })
}

// If the file exists in some filestore, delete it from Minio.
function deleteFromMinio(uri, bucket, key) {
  var shouldDeleteQuery = queryBuilder.checkIsInFilestoreQuery(uri)
  return bot.query(shouldDeleteQuery.compile(), shouldDeleteQuery.params()).then((result) => {
    if(result.records.length > 0 && result.records[0].get('exists') === true) {
      bot.logger.info("Attempting to delete '%s' as it exists in the filesystem.", uri);
      return minioClient.removeObject(bucket, key)
    }
  })
}