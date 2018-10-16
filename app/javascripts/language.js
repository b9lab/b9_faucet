function LanguageSelection() {};

LanguageSelection.prototype.selectedLanguage = ""
LanguageSelection.prototype.languageData = {};

LanguageSelection.prototype.init = function() {
    var ctx = this;
    this.selectedLanguage = this.urlParam("lang") ? this.urlParam("lang") : "en";

    fetch("js/language.json").then(function(response) {
        return response.json();
    }).then(function(json) {
        ctx.languageData = json;
    });
}

LanguageSelection.prototype.getTranslatedString = function(id) {
    return this.languageData["languages"][this.selectedLanguage][id];
}

LanguageSelection.prototype.urlParam = function(name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    } else {
        return decodeURI(results[1]) || 0;
    }
}

var languageSelection = new LanguageSelection();