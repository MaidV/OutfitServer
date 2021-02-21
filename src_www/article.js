import { updateFoldables } from './util';
export class Article {
    constructor(mod, form) {
        this.name = "";
        this.formID = "";
        this.editorID = "";
        this.slots = [];
        this.mod = "";
        this.mod = mod;
        try {
            this.name = form["name"];
            this.formID = form["formID"];
            this.editorID = form["editorID"];
            this.slots = form["slots"];
            this.mod = mod;
        }
        catch (e) {
            throw e;
        }
        this.div = document.createElement("div");
    }
    draw() {
        this.div.innerHTML = `${this.name}<br>&nbsp&nbsp&nbsp&nbsp${this.slots.join(', ')}`;
        return this.div;
    }
    toJSON() {
        return { mod: this.mod, formID: this.formID };
    }
}
export class ArticleStore {
    constructor(container) {
        this.articles = new Map();
        this.div = container;
    }
    insert(article) {
        let aList = this.articles.get(article.mod);
        if (aList)
            aList.push(article);
        else
            this.articles.set(article.mod, [article]);
    }
    get(mod, index) {
        try {
            let modArticles = this.articles.get(mod);
            let i = Number(index);
            if (!modArticles || i === undefined || i < 0 || i > modArticles.length)
                throw "Article not found";
            return modArticles[i];
        }
        catch (e) {
            throw e;
        }
    }
    clear() {
        this.articles.clear();
    }
    entries() {
        return this.articles.entries();
    }
    getDiv() {
        return this.div;
    }
    parseJSONData(inputObjs) {
        this.articles.clear();
        for (let mod in inputObjs) {
            let rawforms = inputObjs[mod];
            let localArticles = Array();
            for (let formid in rawforms) {
                try {
                    let newArticle = new Article(mod, rawforms[formid]);
                    this.insert(newArticle);
                }
                catch (e) {
                    console.log("Record not a valid armor piece: ", e, rawforms[formid]);
                }
            }
        }
        console.log(this.articles);
        this.div.innerHTML = "";
        for (let [mod, local_articles] of this.articles.entries()) {
            let modBtn = document.createElement("BUTTON");
            modBtn.textContent = mod;
            modBtn.className = "collapsible";
            this.div.appendChild(modBtn);
            let articleContainer = document.createElement("div");
            articleContainer.className = "content";
            for (let i = 0; i < local_articles.length; ++i) {
                let article = local_articles[i];
                let articleDiv = article.draw();
                articleDiv.draggable = true;
                articleDiv.ondragstart =
                    function drag(event) {
                        var _a, _b;
                        const target = event.target;
                        (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData("mod", mod);
                        (_b = event.dataTransfer) === null || _b === void 0 ? void 0 : _b.setData("index", String(i));
                    };
                articleContainer.appendChild(articleDiv);
            }
            articleContainer.style.display = "none";
            this.div.appendChild(articleContainer);
        }
    }
}
export function loadArmorData(event) {
    var url = "http://localhost:8000/LoadArmorData";
    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onload = function () {
        // we can use server response to our request now
        let armors = JSON.parse(request.response);
        globalThis.articleStore.parseJSONData(armors);
        updateFoldables();
    };
    request.onerror = function () {
        // request failed
    };
    request.send(new FormData()); // create FormData from form that triggered event
    return false;
}
//# sourceMappingURL=article.js.map