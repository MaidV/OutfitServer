import { parse, updateFoldables } from './util'

interface Form {
    "name": string,
    "formID": string,
    "editorID": string,
    "slots": Array<BigInteger>,
}

export class Article {
    public readonly name: string = "";
    public readonly formID: string = "";
    public readonly editorID: string = "";
    public readonly slots: Array<BigInteger> = [];
    public readonly mod: string = "";
    private div: HTMLDivElement;

    constructor(mod: string, form: Form) {
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

    public draw(): HTMLElement {
        this.div.innerHTML = `${this.name}<br>&nbsp&nbsp&nbsp&nbsp${this.slots.join(', ')}`;
        return this.div;
    }

    public toJSON() {
        return {mod: this.mod, formID: this.formID};
    }
}

export class ArticleStore {
    private articles: Map<string, Array<Article>>;
    private div: HTMLDivElement;

    constructor(container: HTMLDivElement) {
        this.articles = new Map<string, Array<Article>>();
        this.div = container;
    }

    public insert(article: Article) {
        let aList = this.articles.get(article.mod);
        if (aList)
            aList.push(article);
        else
            this.articles.set(article.mod, [article])
    }

    public get(mod: string, index: string) {
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

    public clear() {
        this.articles.clear();
    }

    public entries() {
        return this.articles.entries();
    }

    public getDiv() {
        return this.div;
    }

    public parseJSONData(inputObjs: any) {
        this.articles.clear();

        for (let mod in inputObjs) {
            let rawforms = inputObjs[mod];
            let localArticles = Array<Article>();

            for (let formid in rawforms) {
                try {
                    let newArticle = new Article(mod, rawforms[formid]);
                    this.insert(newArticle);
                }
                catch (e) {
                    console.log("Record not a valid armor piece: ", e,
                        rawforms[formid]);
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
                    function drag(event: DragEvent) {
                        const target = event.target as HTMLInputElement;
                        event.dataTransfer?.setData("mod", mod);
                        event.dataTransfer?.setData("index", String(i));
                    };

                articleContainer.appendChild(articleDiv);
            }
            articleContainer.style.display = "none";
            this.div.appendChild(articleContainer);
        }
    }
}

export function loadArmorData(event: Event) {
    var url = "http://localhost:8000/LoadArmorData";
    var request = new XMLHttpRequest();

    request.open('POST', url, true);
    request.onload = function () { // request successful
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
