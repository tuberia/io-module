import * as file from 'file-oath';
import path from 'path';
import pathIsAbsolute from 'path-is-absolute';
import pipeline, { Document } from 'tuberia-core';

function findConfig(dir, filename, required, ctx) {
  var checkFile = path.join(dir, filename);
  return file.read(checkFile).then(x => {
    ctx.configFile = checkFile;
    ctx.configFolder = dir;
    return x;
  }).catch(function () {
    var updir = path.join(dir, '..');
    if (updir === dir) {
      if (!required) {
        return '';
      }
      throw new Error('Could not find ' + filename + ' file in current or parent folder.');
    }
    return findConfig(updir, filename, required, ctx);
  });
}

let createDoc = function (content) {
  let doc = Document.create(content);
  return [doc];
};

class ReadConfigModule {
  constructor(filename, mods = []) {
    mods.unshift('ReadConfigModule.parse');
    this.pipeline = pipeline.apply(null, mods);
    this.filename = filename;
    this.required = true;
  }

  optional() {
    this.required = false;
    return this;
  }

  execute(docs, ctx) {
    let configFile = this.filename;
    let configDir = process.cwd();
    if (ctx.config && ctx.config.config) {
      configFile = ctx.config.config;
    }
    if (pathIsAbsolute(configFile)) {
      configDir = path.dirname(configFile);
      configFile = path.basename(configFile);
    }
    return findConfig(configDir, configFile, this.required, ctx).then(createDoc).then(ldocs => {
      return this.pipeline.run(ctx, {docs: ldocs});
    }).then(ldocs => {
      ctx.config = ctx.config || {};
      let oneTrue = ldocs[0].meta;
      for (let key of Object.keys(oneTrue)) {
        if (!(key in ctx.config)) {
          ctx.config[key] = oneTrue[key];
        }
      }
      return docs;
    });
  }
}

export default function readConfig(...mods) {
  let file;
  if (mods.length && typeof mods[0] === 'string') {
    file = mods.shift();
  }
  return new ReadConfigModule(file, mods);
}