

module.exports.isImage= function(fileString){
    if(typeof(fileString)==="string"){
        var fileExt = fileString.split('.').pop();
        if(fileExt.length > 1)
            switch(fileExt.toLowerCase()) {
                case ".jpg":
                    return true
                    break;
                case ".jpeg":
                    return true;
                    break;
                case ".gif":
                    return true;
                    break;
                case ".png":
                    return true;
                    break;
                default:
                    return false;
            }
        else return false
        }
    else return false
}