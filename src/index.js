/**
 * Logs all info available from File api
 * @param {File} file 
 */
function log_file_info(file) {
    console.log('name: ' + file.name)
    console.log('lastModified: ' + file.lastModified)
    console.log('lastModifiedDate: ' + file.lastModifiedDate)
    console.log('size: ' + file.size)
    console.log('type: ' + file.type)
}

async function hashArrayBuffer(buffer) {
    hash  = await window.crypto.subtle.digest({name: "SHA-256",}, buffer)
    return hash
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

// Drop handler function to get all files
async function getAllFileEntries(dataTransferItemList) {
    let fileEntries = [];
    // Use BFS to traverse entire directory/file structure
    let queue = [];
    // Unfortunately dataTransferItemList is not iterable i.e. no forEach
    for (let i = 0; i < dataTransferItemList.length; i++) {
      queue.push(dataTransferItemList[i].webkitGetAsEntry());
    }
    while (queue.length > 0) {
      let entry = queue.shift();
      if (entry.isFile) {
        fileEntries.push(entry);
      } else if (entry.isDirectory) {
        let reader = entry.createReader();
        queue.push(...await readAllDirectoryEntries(reader));
      }
    }
    return fileEntries;
  }
  
  // Get all the entries (files or sub-directories) in a directory by calling readEntries until it returns empty array
  async function readAllDirectoryEntries(directoryReader) {
    let entries = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
      entries.push(...readEntries);
      readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
  }
  
  // Wrap readEntries in a promise to make working with readEntries easier
  async function readEntriesPromise(directoryReader) {
    try {
      return await new Promise((resolve, reject) => {
        directoryReader.readEntries(resolve, reject);
      });
    } catch (err) {
      console.log(err);
    }
  }

  async function getFile(fileEntry) {
    try {
      return await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
    } catch (err) {
      console.log(err);
    }
  }

/**
 * Returns a promise yielding an array buffer of the file contents
 * @param {File} file The file to read
 * @param {boolean} binary If true the file will be read into an ArrayBuffer, if false it will be read as a string
 */
async function readFile(file, binary=true) {
  // We prefer to use the new arrayBuffer Blob function directly. It already returns a promise.
  if (typeof file.arrayBuffer === "function") {
      if (binary) {
          return file.arrayBuffer()
      } else {
          return file.text()
      }
  } else {
      reader = new FileReader()
      return new Promise((resolve, reject) => {
          reader.onerror = () => {
              temporaryFileReader.abort();
              reject(new DOMException("Problem parsing file."));
          };
      
          reader.onload = () => {
              resolve(reader.result);
          };
          if (binary) {
              reader.readAsArrayBuffer(file);
          } else {
              reader.readAsText()
          }
      })
  }
}
  

document.addEventListener("DOMContentLoaded", function() {
    bindHandler();
});
  
  function bindHandler() {
    var elDrop = document.getElementById('dropzone');
    var elItems = document.getElementById('items');
  
    elDrop.addEventListener('dragover', function (event) {
        event.preventDefault();
        elItems.innerHTML = '';
    });
    
    elDrop.addEventListener('drop', async function (event) {
        event.preventDefault();
        let items = await getAllFileEntries(event.dataTransfer.items);
        elItems.innerHTML = items.length + ' files' + '<br />'
        for (let i = 0; i < items.length; i++) {
            item = items[i]
            if (item.isFile) {
                file = await getFile(item)
                data = await readFile(file)
                hash = await hashArrayBuffer(data)
                elItems.innerHTML += item.name + ' - ' + item.fullPath + ' - ' + file.size + ' bytes' + ' - ' + buf2hex(hash) + '<br />'
            } else {
                console.log('skipping non file item at index ' + i)
            }
        }
    });
  }
  