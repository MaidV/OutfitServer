import { Article, ArticleStore } from './article'
import { Outfit, OutfitStore } from './outfit'

export class Transform {
    public baseArticle: Article;
    public outfits: Array<Outfit> = [];
    private div: HTMLDivElement;
    private outfitDiv: HTMLDivElement;

    constructor() {
    }

    public insert(indexStr: int, modStr: int): void {
    }

    public getDiv(): HTMLDivElement {
        return this.div;
    }
}

export class TransformStore {
    public transforms: Array<Transform> = [];
    private div: HTMLDivElement;

    constructor(div: HTMLDivElement) {
        this.div = div;
    }
}
