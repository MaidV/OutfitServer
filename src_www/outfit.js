import { Article } from './article';
export class Outfit {
    constructor(name) {
        this.name = "";
        this.articles = [];
        this.name = name;
        this.div = document.createElement("div");
        this.div.setAttribute("id", "outfit:" + this.name);
        this.div.setAttribute("class", "outfit");
        this.div.innerHTML = this.name;
        this.articleDiv = document.createElement("div");
        this.articleDiv.setAttribute("class", "outfit-content");
        this.div.appendChild(this.articleDiv);
        this.div.ondragover = function (event) {
            event.preventDefault();
        };
        this.div.ondblclick = (event) => {
            var url = "http://localhost:8000/TryOutfit";
            var request = new XMLHttpRequest();
            request.open('POST', url, true);
            //request.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
            let jsonStr = JSON.stringify({
                "name": this.name,
                "articles": this.articles
            });
            request.send(jsonStr);
            console.log(jsonStr);
            console.log(JSON.parse(jsonStr));
            return false;
        };
        this.div.ondrop = (event) => {
            var _a, _b;
            event.preventDefault();
            const modStr = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData("mod");
            const indexStr = (_b = event.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData("index");
            if (indexStr && modStr) {
                this.insert(indexStr, modStr);
            }
        };
    }
    insert(indexStr, modStr) {
        let elID = `${this.name};${modStr};${indexStr}`;
        if (document.getElementById(elID))
            return;
        let articleBase = globalThis.articleStore.get(modStr, indexStr);
        let article = new Article(articleBase.mod, articleBase);
        this.articles.push(article);
        let articleDiv = article.draw();
        articleDiv.setAttribute("id", elID);
        this.articleDiv.appendChild(articleDiv);
    }
    getDiv() {
        return this.div;
    }
}
export class OutfitStore {
    constructor(div) {
        this.outfits = new Map();
        this.div = div;
    }
    insert() {
        let outfitIndex = this.outfits.size;
        let outfitName = prompt("Enter outfit name: ", `Outfit ${outfitIndex}`);
        if (outfitName && !this.outfits.has(outfitName)) {
            let outfit = new Outfit(outfitName);
            this.outfits.set(outfitName, outfit);
            this.div.appendChild(outfit.getDiv());
        }
    }
}
//# sourceMappingURL=outfit.js.map