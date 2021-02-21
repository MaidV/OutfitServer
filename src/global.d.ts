import { ArticleStore } from './article'
import { OutfitStore } from './outfit'

declare global {
    var articleStore: ArticleStore;
    var outfitStore: OutfitStore;
}
