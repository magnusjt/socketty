// Mega hacky way of downloading a file with javascript
var saveData = function (data, fileName) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    var blob = new Blob([data], {type: "octet/stream"});
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export default saveData;