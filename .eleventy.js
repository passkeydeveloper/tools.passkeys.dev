const sitemap = require("@quasibit/eleventy-plugin-sitemap");


module.exports = function (eleventyConfig) {
    // Copy your 'assets' folder to the output
    eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
    // Copy static files from content (like images) to the corresponding output structure
    eleventyConfig.addPassthroughCopy({ "src/content": "." });

    // Add the sitemap plugin
    eleventyConfig.addPlugin(sitemap, {
        sitemap: {
            hostname: "https://tools.passkeys.dev", // Your live URL
        },
    });


    return {
        dir: {
            input: "src", // Use src directory
            output: "_output" // Generate to _site folder
        }
    };
};