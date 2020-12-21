let treeStrs = ["tree1"];
for (let treeStr of treeStrs) {
  let divEl = document.getElementById(treeStr);
  if (divEl) {
    let newStr = treeStr;
    divEl.innerHTML = newStr;
  }
  else {
    throw Error(`Error drawing ${treeStr}`)
  }
}

let fileSelector = document.getElementById("file-selector");

let inputObjs = new Map();
fileSelector?.addEventListener("change",
  function loadJSONFiles(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files)
      return;

    console.log(files);

    for (let file of files) {
      const reader: FileReader = new FileReader();

      reader.onload = function(e: Event) {
        if (!this.result || this.result instanceof ArrayBuffer)
          return;

        let key = file.name.replace(/\.json/, "");
        inputObjs.set(key, JSON.parse(this.result));
      };

      reader.readAsText(file);
    }

    console.log(inputObjs);
  }
)
