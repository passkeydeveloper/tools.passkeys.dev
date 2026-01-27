/** @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig */
export default function (eleventyConfig) {
  const inputPath = "./public";

  eleventyConfig.setInputDirectory(inputPath);
  eleventyConfig.setOutputDirectory("./_site");

  // Assets for the homepage
  eleventyConfig.addPassthroughCopy(`${inputPath}/assets/`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/*.{png,txt}`);

  // Tool-specific assets
  eleventyConfig.addPassthroughCopy(`${inputPath}/featuredetect/**/*.{png,txt}`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/relatedorigins/**/*.{js,}`);
  eleventyConfig.addPassthroughCopy(`${inputPath}/responsedecoder/**/*.{js,}`);
}
