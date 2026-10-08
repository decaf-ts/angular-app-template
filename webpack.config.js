const TerserPlugin = require("terser-webpack-plugin");

module.exports = (config, options) => {
  config.resolve = config.resolve || {};

  config.resolve.fallback = {
    worker_threads: false,
    crypto: false,
    fs: false,
    path: false,
    libxmljs2: false,
    "@nestjs/*": false,
  };
  // Angular CLI's default minimizer mangles class/function names, which
  // breaks @decaf-ts decorators that rely on constructor.name / class.name
  // at runtime (property-based mangling breaks reflection-based metadata
  // lookups). We replace the minimizer here with Terser configured to keep
  // class and function names intact. This still gives us: dead code
  // elimination, whitespace/comment stripping, local variable mangling, and
  // console/debugger stripping — the vast majority of the size win —
  // without touching anything decorators depend on.
  if (config.mode !== "development") {
    config.optimization = config.optimization || {};
    config.optimization.minimize = true;
    config.optimization.minimizer = [
      new TerserPlugin({
        terserOptions: {
          ecma: 2020,
          compress: {
            keep_classnames: true,
            keep_fnames: true,
            // passes: 2 is Angular CLI's default; keep it modest to avoid
            // build time blowing up on top of the decorator-safety constraint
            passes: 2,
            // Angular's own JavaScriptOptimizerPlugin normally injects these via
            // @angular/compiler-cli's GLOBAL_DEFS_FOR_TERSER(_WITH_AOT). Replacing
            // the minimizer array here bypasses that plugin, so without redefining
            // them ngDevMode/ngJitMode/ngI18nClosureMode are left as free variables
            // in the minified bundle, throwing "ngDevMode is not defined" at runtime.
            global_defs: {
              ngDevMode: false,
              ngI18nClosureMode: false,
              ngJitMode: false,
            },
          },
          mangle: {
            keep_classnames: true,
            keep_fnames: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ];
  }

  // config.ignoreWarnings = [
  //   ...(config.ignoreWarnings || []),
  //   {
  //     module: /decaf-ts-for-angular/,
  //     message: /Critical dependency: the request of a dependency is an expression/,
  //   },
  // ];

  return config;
};
