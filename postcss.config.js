module.exports = {
  plugins: [
    require("cssnano")({
      preset: [
        "default",
        {
          discardComments: {
            removeAll: true,
          },

          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          discardDuplicates: true,
          discardEmpty: true,
          mergeLonghand: true,
          mergeRules: true,
          minifyFontValues: true,
          minifyGradients: true,
          minifyParams: true,
          minifySelectors: true,
          reduceIdents: true,
          reduceTransforms: true,
          uniqueSelectors: true,
        },
      ],
    }),
  ],
};
