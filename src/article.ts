import { parse, updateFoldables } from './util'

export class Article {
    public readonly name: string = "";
    public readonly FormID: string = "";
    public readonly EDID: string = "";
    public readonly slots: Array<string> = [];
    public readonly mod: string = "";
    private div: HTMLDivElement;

    constructor(mod: string,
        form: {
            "FULL - Name": string,
            "Record Header": { "FormID": string, "Record Flags": { "Non-Playable": string } },
            "EDID - Editor ID": string,
            "BOD2 - Biped Body Template": { "First Person Flags": any },
        }) {
        this.mod = mod;
        try {
            if (form["Record Header"]["Record Flags"]["Non-Playable"])
                throw 'Non-playable form';
            this.name = form["FULL - Name"];
            if (!this.name)
                throw 'Undefined name';
            this.FormID = "0x" + form["Record Header"]["FormID"].substr(2);
            this.EDID = form["EDID - Editor ID"];
            this.slots = Object.keys(form["BOD2 - Biped Body Template"]["First Person Flags"]);
            if (Object.keys(this.slots).length == 0)
                throw 'No slots defined';
        }
        catch (e) {
            throw e;
        }
        this.div = document.createElement("div");
    }

    public Draw(): HTMLElement {
        this.div.innerHTML = `${this.name}<br>&nbsp&nbsp&nbsp&nbsp${this.slots.join(', ')}`;
        return this.div;
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

    public parseJSONFiles(inputObjs: Map<string, any>) {
        this.articles.clear();
        for (let [mod, rawforms] of inputObjs.entries()) {
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
                let articleDiv = article.Draw();
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

export async function loadJSONFiles(event: Event, articleStore: ArticleStore) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files)
        return;

    let inputObjs = new Map<string, any>();
    for (let f of files) {
        let key = f.name.replace(/\.json/, "");
        let formMap = await parse(f);
        inputObjs.set(key, formMap);
    }

    articleStore.parseJSONFiles(inputObjs);
    updateFoldables();
}
