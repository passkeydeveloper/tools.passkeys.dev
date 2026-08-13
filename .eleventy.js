const pluginSitemap = require("@quasibit/eleventy-plugin-sitemap");

module.exports = function(eleventyConfig) {
    // Passthrough copy for assets
    eleventyConfig.addPassthroughCopy("src/assets");

    // Copy tool-specific scripts that aren't integrated into the build yet
    // We'll move them to src/ as we migrate
    eleventyConfig.addPassthroughCopy("src/featuredetect/*.png");
    eleventyConfig.addPassthroughCopy("src/featuredetect/robots.txt");
    eleventyConfig.addPassthroughCopy("src/relatedorigins/script.js");
    eleventyConfig.addPassthroughCopy("src/responsedecoder/*.js");
    eleventyConfig.addPassthroughCopy("src/responsedecoder/sample-data/*.json");

    // Plugins
    eleventyConfig.addPlugin(pluginSitemap, {
        sitemap: {
            hostname: "https://tools.passkeys.dev",
        },
    });

    eleventyConfig.addFilter("date", (date, format) => {
        const { DateTime } = require("luxon");
        return DateTime.fromJSDate(date).toFormat(format);
    });

    eleventyConfig.addPassthroughCopy("src/robots.txt");

    // Helper to determine if a link is active
    eleventyConfig.addFilter("isActive", (currentPath, linkPath) => {
        if (linkPath === "/") {
            return currentPath === "/" || currentPath === "/index.html";
        }
        return currentPath.includes(linkPath);
    });

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            data: "_data"
        },
        templateFormats: ["md", "njk", "html"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        dataTemplateEngine: "njk",
    };
};
