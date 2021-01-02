import { Article, ArticleStore } from './article'

export class Outfit {
    public name: string = "";
    public articles: Array<Article> = [];
    private div: HTMLDivElement;

    constructor(name: string) {
        this.name = name;
        this.div = document.createElement("div");
        this.div.setAttribute("id", "outfit:" + this.name);
        this.div.innerHTML = this.name;

        this.div.ondragover = function(event: DragEvent) {
            event.preventDefault();
        };

        this.div.ondrop = function(event: DragEvent) {
            event.preventDefault();
            const modStr = event.dataTransfer?.getData("mod");
            const indexStr = event.dataTransfer?.getData("index");
            let target = event.target as HTMLDivElement;

            if (indexStr && modStr) {
                let article = globalThis.articleStore.get(modStr, indexStr);
                let articleDiv = article.Draw();
                target.appendChild(articleDiv);
            }
        };
    }

    public insert(article: Article): void {
        this.articles.push(article);
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
