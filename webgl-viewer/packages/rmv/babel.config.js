module.exports = {
  presets: [
    [
      '@m-fe',
      {
        import: true,
        react: true,
        typescript: true
      }
    ]
  ],
  plugins: ['@babel/plugin-proposal-object-rest-spread', '@babel/plugin-transform-spread']
};
