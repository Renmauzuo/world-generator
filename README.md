# Random World Generator
Inspired by [Nested](https://orteil.dashnet.org/nested), this is a random world generator for D&D 5th ed that generates random details about a world on demand.

View on [Github.io](https://renmauzuo.github.io/world-generator/)

## Requirements

- [Node.js](https://nodejs.org/en/)

## Installation

`npm install`

## Usage

### Visual Studio Code configurations

The most common tasks can be accessed through the dropdown menu in the debug tab in Visual Studio Code. These are configured in the .vscode/launch.json file to run gulp tasks with node environment variables.

### development

This will clean the docs folder and run a gulp development build.

### production

This will clean the docs folder and run a gulp production build. Run this before uploading/publishing.

### npm Scripts

These are shortcuts for gulp tasks that can be run using npm (e.g. npm run build)

There are also scripts that mirror the Visual Studio Code configurations (e.g. production).

They are below and in the package.json file.

#### npm run clean

Delete the docs folder.

#### npm run build

Runs a development build without cleaning the docs folder.

#### npm run watch

Runs a development build and starts watching the files for changes in order to rebuild when needed.

#### npm run development

This will clean the docs folder and run a gulp development build.

#### npm run production

This will clean the dist folder and run a gulp production build. Run this before uploading/publishing.

### Gulp Tasks

These are the underlying tasks that are run by Visual Studio Code or npm.

#### npx gulp clean

Delete the docs folder.

#### npx gulp build

Builds the project without cleaning the docs folder.

#### npx gulp rebuild

Cleans the docs folder and builds the project.

#### npx gulp watch

Begins watching files for changes.

#### npx gulp (default)

Cleans, rebuilds, and watches.
 