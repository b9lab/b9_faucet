import translations from "./language.json";

function LanguageSelection() {};

LanguageSelection.prototype.selectedLanguage = ""
LanguageSelection.prototype.translations = {};

LanguageSelection.prototype.init = function() {
    const ctx = this;
    ctx.translations = translations.languages;

    const browserLang = navigator.language.substr(0, 2);
    ctx.selectedLanguage = ctx.isLanguageAvailable(browserLang) ? browserLang : "en";

    const urlParams = new URLSearchParams(window.location.search);
    ctx.selectedLanguage = urlParams.has("lang") ? urlParams.getAll("lang") : ctx.selectedLanguage;
};

LanguageSelection.prototype.getTranslatedString = function(id) {
    return this.translations[this.selectedLanguage][id];
};

LanguageSelection.prototype.isLanguageAvailable = function(lang) {
    return typeof(this.translations[lang]) !== "undefined";
};

export const languageSelection = new LanguageSelection();
languageSelection.init();