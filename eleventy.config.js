import sitemap from '@quasibit/eleventy-plugin-sitemap';

/** @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig */
export default function (eleventyConfig) {
  const inputPath = "./public";

  eleventyConfig.setInputDirectory(inputPath);
  eleventyConfig.setOutputDirectory("./_site");

  // Generate a sitemap
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: 'https://tools.passkeys.dev',
    },
  });

  // Specify assets for the homepage
  eleventyConfig.addPassthroughCopy(`${inputPath}/assets/`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/*.{png,txt}`);

  // Declare tool-specific assets
  eleventyConfig.addPassthroughCopy(`${inputPath}/featuredetect/**/*.{png,txt}`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/relatedorigins/**/*.{js,}`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/responsedecoder/**/*.{js,}`);
}
