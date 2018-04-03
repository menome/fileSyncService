/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Builds the CQL Queries that create new file nodes (or delete them)
 */
var Query = require('decypher').Query;
var bot = require('@menome/botframework');
var fileConnectionQueryFuncs = require('../config/connectionQueries');

module.exports = {
  addFileQuery,
  fileConnectionQueries,
  removeFileQuery,
  addFullTextQuery,
  addThumbnailQuery,
  addSummaryTextQuery,
  addArticleQuery,
  addChecksumQuery,
  setCorruptFlagQuery,
  checkIsInFilestoreQuery
}

/** 
 * Takes an object with file metadata.
 * Returns CQL query that will build the object.
 * Doesn't link it to anything. Just creates the basic node with all its properties.
 */
function addFileQuery(fileObj) {
  var query = new Query();
  var params = {
    Name:  fileObj.urlWithBucket.substring(fileObj.urlWithBucket.lastIndexOf('/')+1), //decodeURIComponent(fileObj.key.substring(fileObj.key.lastIndexOf('/')+1)),
    Size: fileObj.size,
    Uri: fileObj.urlWithBucket,
    LastModified: fileObj.lastModified.toUTCString(),
    ImportId: fileObj.importId,
    PendingUpload: false,
    Extension: fileObj.urlWithBucket.split('.').pop()
  };

  var newUuid = bot.genUuid();

  query.merge("(f:File:Card {Uri: $uri})",{uri: params.Uri});
  query.with("f, f.Uuid as olduuid, exists(f.Uuid) as ex");
  query.set("f += $params,f.Uuid = case ex when true then olduuid else $newUuid end", {params: params, newUuid: newUuid});
  return query;
}

/**
 * Takes an object with article data
 *  Return cql query that builds the object
 * Doesn't link it to anything
 */
function addArticleQuery(articleObj){
  var query = new Query();
  var params = {
    Name: articleObj.Name,
    Uri: articleObj.Key,
    Description: articleObj.Properties.Description,
    ImageURL: articleObj.Properties.ImageURL,
    Author: articleObj.Properties.Author,
    DatePublished: articleObj.Properties.DatePublished,
    Publisher: articleObj.Properties.Publisher,
    FullText: articleObj.Properties.FullText
  }
  query.merge("(a:Card:Article {Uri: {uri}})",{uri: params.Uri})
  query.set("a += {params}", {params: params});
  return query;
}
/**
 * Takes an object with file metadata.
 * Gives back a list of cql queries that will connect that file to other nodes.
 */
function fileConnectionQueries(fileObj) {
  return fileConnectionQueryFuncs.map(function(func) {
    return func(fileObj);
  });
}

/**
 * Returns a query that updates the given file node with an absolute fuckpile of text
 * in an indexed property.
 */
function addFullTextQuery(uri, fulltext) {
  var query = new Query();
  query.match("(f:File:Card {Uri: {uri}})", {uri: uri})
  query.set("f.FullText = {fulltext}", {fulltext: fulltext})
  return query;
}

/**
 * Returns a query that updates the given file node with a SHA256 Checksum
 */
function addChecksumQuery(uri, checksum) {
  var query = new Query();
  query.match("(f:File:Card {Uri: {uri}})", {uri: uri})
  query.set("f.SHA256 = {checksum}", {checksum: checksum})
  return query;
}

/**
 * Returns true if the file exists in the filestore.
 */
function checkIsInFilestoreQuery(uri) {
  var query = new Query();
  query.match("(f:File:Card {Uri: {uri}})", {uri: uri})
  query.return("f.ExistsInFilestore as exists");
  return query;
}

/**
 * Returns a query that updates the given file node with an absolute fuckpile of text
 * in an indexed property.
 */
function addSummaryTextQuery(uri, summaryText) {
  var query = new Query();
  query.match("(f:File:Card {Uri: {uri}})", {uri: uri})
  query.set("f.Summary = {summarytext}",{summarytext: summaryText} )
  return query;
}


/**
 * Returns a query that updates the file node by setting thumbnail = true
 */
function addThumbnailQuery(uri, profileImageUri) {
  var query = new Query();
  query.match("(f:File:Card {Uri: {uri}})", {uri: uri})
  query.set("f.Thumbnail = true")
  query.set("f.ProfileImage={profileImage}", {profileImage:profileImageUri} )
  return query;
}

/** 
 * Takes an object with file metadata.
 * Returns CQL query that will delete the object and all relationships from the db.
 */
function removeFileQuery(fileObj) {
  var query = new Query();
  query.match("(f:File:Card)");
  query.where("f.Uri = {filepath}", {filepath: fileObj.urlWithBucket})
  query.add("DETACH DELETE f");
  return query;
}

function setCorruptFlagQuery(fileObj){
  var query = new Query();
  query.match("(f:File:Card)");
  query.where("f.Uri = {filepath}", {filepath: fileObj})
  query.set("f.Corrupt = true");
  return query;
}
