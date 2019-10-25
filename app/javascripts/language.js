function LanguageSelection() {};

LanguageSelection.prototype.selectedLanguage = ""
LanguageSelection.prototype.languageData = {};

LanguageSelection.prototype.init = function() {
    var ctx = this;

    return fetch("js/language.json").then(function(response) {
        return response.json();
    }).then(function(json) {
        ctx.languageData = json;
        let browserLang = navigator.language.substr(0, 2);
        ctx.selectedLanguage = ctx.isLanguageAvailable(browserLang) ? browserLang : "en";

        var urlParams = new URLSearchParams(window.location.search);
        ctx.selectedLanguage = urlParams.has("lang") ? urlParams.getAll("lang") : ctx.selectedLanguage;
        return Promise.resolve();
    });
}

LanguageSelection.prototype.getTranslatedString = function(id) {
    return this.languageData["languages"][this.selectedLanguage][id];
}

LanguageSelection.prototype.isLanguageAvailable = function(lang) {
    return typeof(this.languageData["languages"][lang]) != "undefined";
}

var languageSelection = new LanguageSelection();