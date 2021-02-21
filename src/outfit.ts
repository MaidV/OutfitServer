import { Article, ArticleStore } from './article'

export class Outfit {
    public name: string = "";
    public articles: Array<Article> = [];
    private div: HTMLDivElement;
    private articleDiv: HTMLDivElement;

    constructor(name: string) {
        this.name = name;
        this.div = document.createElement("div");
        this.div.setAttribute("id", "outfit:" + this.name);
        this.div.setAttribute("class", "outfit");
        this.div.innerHTML = this.name;

        this.articleDiv = document.createElement("div");
        this.articleDiv.setAttribute("class", "outfit-content");

        this.div.appendChild(this.articleDiv);

        this.div.ondragover = function(event: DragEvent) {
            event.preventDefault();
        };

        this.div.ondblclick = (event: Event) => {
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
        }

        this.div.ondrop = (event: DragEvent) => {
            event.preventDefault();
            const modStr = event.dataTransfer?.getData("mod");
            const indexStr = event.dataTransfer?.getData("index");

            if (indexStr && modStr) {
                this.insert(indexStr, modStr);
            }
        };
    }

    public insert(indexStr: string, modStr: string): void {
        let elID = `${this.name};${modStr};${indexStr}`
        if (document.getElementById(elID))
            return;

        let articleBase = globalThis.articleStore.get(modStr, indexStr);
        let article = new Article(articleBase.mod, articleBase);
        this.articles.push(article);
        let articleDiv = article.draw();
        articleDiv.setAttribute("id", elID);
        this.articleDiv.appendChild(articleDiv);
    }

    public getDiv(): HTMLDivElement {
        return this.div;
    }
}

export class OutfitStore {
    public outfits: Map<string, Outfit>;
    private div: HTMLDivElement;

    constructor(div: HTMLDivElement) {
        this.outfits = new Map<string, Outfit>();
        this.div = div;
    }

    public insert(): void {
        let outfitIndex = this.outfits.size;
        let outfitName = prompt("Enter outfit name: ", `Outfit ${outfitIndex}`);
        if (outfitName && !this.outfits.has(outfitName)) {
            let outfit = new Outfit(outfitName);
            this.outfits.set(outfitName, outfit);
            this.div.appendChild(outfit.getDiv());
        }
    }
}
