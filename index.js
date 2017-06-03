const fs = require('fs');
const path = require('path');
const svgexport = require('svgexport');


const makePromise = (fn) => {
  return new Promise((resolve, reject) => {
    const cb = (err, data) => err ? reject(err) : resolve(data);
    fn(cb);
  });
};

const readDir = function (dir) {
  return makePromise(cb => fs.readdir(dir, cb)); //return list of files
};

const statCursor = function (file) {
  return makePromise(cb => fs.stat(file, cb))
    .then((cursor) => {
      cursor.file = file;
      return cursor;
    })
};

const walk = function (dir) {
  return readDir(dir)
    .then((files) => {
      const promises = files.map(file => statCursor(`${dir}/${file}`));
      return Promise.all(promises);
    })
    .then(files => {
      return files.reduce((acc, file) => {
        if (file.isDirectory() || file.file.substr(-3) !== "svg") {
          return acc;
        }

        acc.push({ file: file.file, name: path.basename(file.file), stamp: file.atime });
        return acc;
      }, []);
    })
    .catch(err => {
      throw err
    });
};

const readFile = function (file) {
  return makePromise(cb => fs.readFile(file, 'utf-8', cb))
};

const writeFile = function (file, content) {
  return makePromise(cb => fs.writeFile(file, content, cb));
};

const worker = (files, cb) => {
  const quefiles = files.slice();
  return function exec() {
    if (quefiles.length === 0) {
      cb();
      return;
    }

    const file = quefiles.shift();
    const datafile = {
      input: [file.file, "svg{background:white;}"],
      output: `result\\${file.name}.jpg`,
    };
    console.log(`Working => ${file.name}`);
    svgexport.render(datafile, exec);
  }
};

walk(process.cwd())
  .then((files) => {
    const wfiles = files;
    const que = worker(wfiles, () => console.log("Done"));
    que();
  });
