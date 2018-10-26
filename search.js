const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const readdirP = promisify(fs.readdir);
const statP = promisify(fs.stat);

if (process.argv.length <= 3) {
    console.log("USAGE: Node search [EXT] [TEXT]");
    process.exit(-1);
}

const root = path.join(__dirname);
const ext = process.argv[2];
const search = process.argv[3];

function sequence(arr, fn) {
    return arr.reduce((p, item) => {
        return p.then(() => {
            return fn(item);
        });
    }, Promise.resolve());
}

function listFiles(rootDir, opts = {}, results = []) {
    let options = Object.assign({recurse: false, results: "arrayOfFilePaths", includeDirs: false, sort: false}, opts);

    function runFiles(rootDir, options, results) {
        return readdirP(rootDir).then(files => {
            let localDirs = [];
            if (options.sort) {
                files.sort();
            }
            return sequence(files, fname => {
                let fullPath = path.join(rootDir, fname);
                return statP(fullPath).then(stats => {
                    // if directory, save it until after the files so the resulting array is breadth first
                    if (stats.isDirectory()) {
                        localDirs.push({name: fname, root: rootDir, full: fullPath, isDir: true});
                    } else {
                        results.push({name: fname, root: rootDir, full: fullPath, isDir: false});
                    }
                });
            }).then(() => {
                // now process directories
                if (options.recurse) {
                    return sequence(localDirs, obj => {
                        // add directory to results in place right before its files
                        if (options.includeDirs) {
                            results.push(obj);
                        }
                        return runFiles(obj.full, options, results);
                    });
                } else {
                    // add directories to the results (after all files)
                    if (options.includeDirs) {
                        results.push(...localDirs);
                    }
                }
            });
        });
    }

    return runFiles(rootDir, options, results).then(() => {
        // post process results based on options
        if (options.results === "arrayOfFilePaths") {
            return results.map(item => item.full);
        } else {
            return results;
        }
    });
}

listFiles(root, {recurse: true, results: "arrayOfFilePaths", sort: true, includeDirs: false}).then(list => {
    let nofound = 0;
    if(list.length > 0){
      for (const f of list) {          
          if(f.indexOf(ext) > -1 && f.indexOf(search) > -1){
            console.log(f);
            nofound+=1;
          }
      }

      if(nofound==0){
        console.log("No file was found");
      }
    }else{
      console.log("No file was found");
    }
    
}).catch(err => {
    console.log(err);
});