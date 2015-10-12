import * as file from 'file-oath';
import path from 'path';
import pathIsAbsolute from 'path-is-absolute';
import { Document } from 'tuberia-core';

class ReadFilesModule {
  constructor(search) {
    this.search = search;
    this.mergeDocs = false;
  }

  merge() {
    this.mergeDocs = true;
    return this;
  }

  execute(docs, ctx) {
    let pathFn = this.search;
    let pathList = new Set();
    let docList = docs;
    if (!this.mergeDocs) {
      docList = [];
    }
    for (let doc of docs) {
      let pattern = pathFn.call(null, doc, ctx);
      // TODO: add glob support.
      pathList.add(pattern);
    }
    let fileProms = [];
    let cwd = process.cwd();
    for (let filename of pathList.keys()) {
      if (!pathIsAbsolute(filename)) {
        filename = path.join(cwd, filename);
      }
      fileProms.push(file.read(filename).then(Document.create).then(d => {
        let lfile = filename,
            readFileExtention = path.extname(lfile),
            readFileDirectory = path.dirname(lfile),
            readFileBasename = path.join(readFileDirectory, path.basename(lfile, readFileExtention)),
            relativeFilePath = path.relative(cwd, lfile),
            relativeBasename = path.join(path.relative(cwd, readFileDirectory), path.basename(lfile, readFileExtention));
        d.addMeta({
          readFilename: lfile,
          readFileExtention,
          readFileDirectory,
          readFileBasename,
          relativeFilePath,
          relativeBasename
        });
        return d;
      }));
    }
    return Promise.all(fileProms).then(newdocs => {
      return docList.concat(newdocs);
    });
  }
}

export default function readFiles(val) {
  if (typeof val === 'string') {
    val = () => val;
  }
  return new ReadFilesModule(val);
}