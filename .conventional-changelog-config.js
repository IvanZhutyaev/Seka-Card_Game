module.exports = {
  preset: 'angular',
  releaseCount: 0,
  outputUnreleased: true,
  pkg: {
    transform: (pkg) => {
      pkg.version = pkg.version || '0.1.0';
      return pkg;
    }
  }
}; 