
export class Article {
    public readonly name: string = "";
    public readonly FormID: string = "";
    public readonly EDID: string = "";
    public readonly slots: Array<string> = [];
    public readonly mod: string = "";

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
    }

    public Draw(): HTMLElement {
        let divEl = document.createElement("div");
        divEl.innerHTML = `${this.name}<br>&nbsp&nbsp&nbsp&nbsp${this.slots.join(', ')}`;
        return divEl;
    }
}

export class ArticleStore {
    private articles: Map<string, Array<Article>>;

    constructor() {
        this.articles = new Map<string, Array<Article>>();
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
}
