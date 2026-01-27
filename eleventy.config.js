/** @param {import("@11ty/eleventy/UserConfig").default} eleventyConfig */
export default function (eleventyConfig) {
  const inputPath = "./public";

  eleventyConfig.setInputDirectory(inputPath);
  eleventyConfig.setOutputDirectory("./_site");

  eleventyConfig.addPassthroughCopy(`${inputPath}/assets/`);
}
