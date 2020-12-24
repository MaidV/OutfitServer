import { Article } from './article'

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

function updateFoldables() {
    let coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    }
}

let articles = new Map<string, Array<Article>>();
async function loadJSONFiles(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files)
        return;

    let inputObjs = new Map<string, any>();
    for (let f of files) {
        let key = f.name.replace(/\.json/, "");
        let formMap = await parse(f);
        inputObjs.set(key, formMap);
    };

    articles.clear();
    for (let [mod, rawforms] of inputObjs.entries()) {
        let localArticles = Array<Article>();

        for (let formid in rawforms) {
            try {
                let newArticle = new Article(rawforms[formid]);
                localArticles.push(newArticle);
            }
            catch (e) {
                console.log("Record not a valid armor piece: ", e,
                    rawforms[formid]);
            }
        }
        articles.set(mod, localArticles);
    }

    let modContainer = document.getElementById("articleContainer");
    if (!modContainer)
        return;

    modContainer.innerHTML = "";
    for (let [mod, local_articles] of articles.entries()) {
        console.log(mod, local_articles);
        let modBtn = document.createElement("BUTTON");
        modBtn.textContent = mod;
        modBtn.className = "collapsible";
        modContainer.appendChild(modBtn);
        let articleContainer = document.createElement("div");
        articleContainer.className = "content";
        for (let article of local_articles) {
            let articleDiv = article.Draw();
            articleDiv.draggable = true;
            articleContainer.appendChild(articleDiv);
        }
        articleContainer.style.display = "none";
        modContainer.appendChild(articleContainer);
    }

    updateFoldables();

}

let fileSelector = document.getElementById("file-selector");
fileSelector?.addEventListener("change", loadJSONFiles);
