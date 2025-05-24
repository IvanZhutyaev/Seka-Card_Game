const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get version type from command line arguments
const versionType = process.argv[2];
if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
  console.error('Please specify version type: major, minor, or patch');
  process.exit(1);
}

try {
  // Update package.json version
  execSync(`npm version ${versionType} --no-git-tag-version`);

  // Generate changelog
  execSync('conventional-changelog -p angular -i CHANGELOG.md -s -r 0');

  // Get new version from package.json
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const newVersion = packageJson.version;

  // Create git tag
  execSync(`git add package.json CHANGELOG.md`);
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
  execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`);

  console.log(`Successfully updated version to ${newVersion}`);
} catch (error) {
  console.error('Error updating version:', error.message);
  process.exit(1);
} 