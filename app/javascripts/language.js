function LanguageSelection() {};

LanguageSelection.prototype.selectedLanguage = ""
LanguageSelection.prototype.languageData = {};

LanguageSelection.prototype.init = function() {
    var ctx = this;
    var urlParams = new URLSearchParams(window.location.search);
    this.selectedLanguage = urlParams.has("lang") ? urlParams.getAll("lang") : "en";

    fetch("js/language.json").then(function(response) {
        return response.json();
    }).then(function(json) {
        ctx.languageData = json;
    });
}

LanguageSelection.prototype.getTranslatedString = function(id) {
    return this.languageData["languages"][this.selectedLanguage][id];
}

var languageSelection = new LanguageSelection();