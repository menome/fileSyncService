/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Add functions that build CQL queries to add links to Facets.
 * TODO: These should be swift and synchronous. We'll need a better framework for async queries.
 * (Such as more in-depth ML/NLP/TM strategies.)
 */
var Query = require('decypher').Query;

module.exports = [
  // If any Facet shares a name with a folder on this guy's filepath, attach it.
  function(fileObj) {
    // for now assume site exists.
    var nodeNames = fileObj.urlWithBucket.split('/');
    if(nodeNames.length < 1) return null;
    var siteCode=nodeNames[0].substring(0,6);
    var query = new Query();
    query.match("(f:File:Facet), (c:Site)");
    query.where("f <> c AND f.Uri  = {uri} AND c.Code contains {siteCode}",{uri: fileObj.urlWithBucket, siteCode: siteCode});
    query.merge("(f)-[:AttachedTo]->(c)");
    return query;
  },

  // geotech reports
  function(fileObj){
      var filename = fileObj.urlWithBucket.toLowerCase(); 
      var query = new Query();
      query.match("(f:File:Facet), (c:ReportType {Name:'Geotechnical Report'})");
      query.where("f <> c AND f.Uri = {uri} AND lower({uri}) contains 'geotech'",{uri: fileObj.urlWithBucket});
      query.merge("(f)-[:ReportTypeOf]->(c)");
      return query;
    }, 
    // schematic reports
      function(fileObj){
        var query = new Query();
        query.match("(f:File:Facet), (c:ReportType {Name:'SD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'schema'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:ReportTypeOf]->(c)");
        return query;
      },
     // development reports
      function(fileObj){
        var query = new Query();
        query.match("(f:File:Facet), (c:ReportType {Name:'DD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'dd report' or lower({uri}) contains 'devel'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:ReportTypeOf]->(c)");
        return query;
      },
      // tecnical design reports
      function(fileObj){
          var query = new Query();
        query.match("(f:File:Facet), (c:ReportType {Name:'TD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'td report' or lower({uri}) contains 'technical'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:ReportTypeOf]->(c)");
        return query;
      },
      // final reports
      function(fileObj){
        var query = new Query();
        query.match("(f:File:Facet), (c:ReportType {Name:'Final Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'final'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:ReportTypeOf]->(c)");
        return query;
      },
      // structural reports
      function(fileObj){
        var query = new Query();
        query.match("(f:File:Facet), (c:ReportType {Name:'Structural Report'})");
        query.where("f <> c AND f.Uri = {uri} AND lower({uri}) contains 'structural'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:ReportTypeOf]->(c)");
        return query;
      }
];