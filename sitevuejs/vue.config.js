const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [],
  chainWebpack: config => {
    // Désactive le plugin de progression qui pose problème avec certaines versions
    ;['progress', 'progress-plugin', 'ProgressPlugin'].forEach((key) => {
      try { config.plugins.delete(key) } catch (e) {}
    })
  }
})
