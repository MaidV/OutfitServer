import { Article } from './article'

let fileSelector = document.getElementById("file-selector");

let articles = new Map<string, Array<Article>>();
fileSelector?.addEventListener("change",
  async function loadJSONFiles(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files)
      return;

    let inputObjs = new Map<string, any>();
    for (let f of files) {
      function parse(file: File) {
        return new Promise((resolve, reject) => {
          const reader: FileReader = new FileReader();

          reader.onload = function(e: Event) {
            if (!this.result || this.result instanceof ArrayBuffer)
              return;
            resolve(JSON.parse(this.result));
          };
          reader.onerror = function(e: any) {
            reject(e);
          };
          reader.readAsText(file);
        });
      };

      let key = f.name.replace(/\.json/, "");
      let formMap = await parse(f);
      inputObjs.set(key, formMap);
    };

    for (let [mod, rawforms] of inputObjs.entries()) {
      let local_articles = Array<Article>();
      for (let formid in rawforms) {
        try {
          let newArticle = new Article(rawforms[formid]);
          local_articles.push(new Article(rawforms[formid]));
        }
        catch {
          console.log("Record not a valid armor piece: ", rawforms[formid]);
        }
      }
      articles.set(mod, local_articles);
    }

    console.log(articles);
  });
