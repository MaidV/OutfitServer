import { ArticleStore, loadArmorData } from './article';
import { OutfitStore } from './outfit';
function main() {
    let outfitContainer = document.getElementById("outfitContainer");
    let articleContainer = document.getElementById("articleContainer");
    let armorLoader = document.getElementById("armorLoader");
    const menu = document.querySelector(".menu");
    if (!outfitContainer || !articleContainer || !armorLoader || !menu) {
        console.log("Unable to init app");
        return;
    }
    globalThis.articleStore = new ArticleStore(articleContainer);
    globalThis.outfitStore = new OutfitStore(outfitContainer);
    armorLoader.addEventListener("click", loadArmorData);
    // Menu logic
    let menuVisible = false;
    function toggleMenu(command) {
        menu.style.display = command === "show" ? "block" : "none";
        menuVisible = !menuVisible;
    }
    ;
    function setPosition(origin) {
        menu.style.left = `${origin.left}px`;
        menu.style.top = `${origin.top}px`;
        toggleMenu("show");
    }
    ;
    window.addEventListener("click", function (e) {
        if (menuVisible)
            toggleMenu("hide");
    });
    window.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        const origin = {
            left: e.pageX,
            top: e.pageY
        };
        setPosition(origin);
        return false;
    });
    let outfitAdder = document.getElementById("outfitAdder");
    outfitAdder === null || outfitAdder === void 0 ? void 0 : outfitAdder.addEventListener("click", function (e) {
        globalThis.outfitStore.insert();
    });
}
main();
//# sourceMappingURL=index.js.map