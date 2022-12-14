import { ArticleStore, loadArmorData } from './article'
import { OutfitStore } from './outfit'
import { initWindow, getHighestZ } from './util'

function main(): void {
    let outfitContainer = document.getElementById("outfitContainer") as HTMLDivElement;
    let articleContainer = document.getElementById("articleContainer") as HTMLDivElement;
    let armorLoader = document.getElementById("armorLoader") as HTMLLIElement;
    const menu = document.querySelector(".menu") as HTMLElement;

    if (!outfitContainer || !articleContainer || !armorLoader || !menu) {
        console.log("Unable to init app");
        return;
    }

    let articleWindow = document.getElementById("article-window") as HTMLDivElement;
    let outfitWindow = document.getElementById("outfit-window") as HTMLDivElement;
    let transformWindow = document.getElementById("transform-window") as HTMLDivElement;

    initWindow(articleWindow);
    initWindow(outfitWindow);
    initWindow(transformWindow);

    globalThis.articleStore = new ArticleStore(articleContainer);
    globalThis.outfitStore = new OutfitStore(outfitContainer);
    armorLoader.addEventListener("click", loadArmorData);

    // Menu logic
    let menuVisible = false;
    function toggleMenu(command: string) {
        menu.style.display = command === "show" ? "block" : "none";
        if (command === "show") {
            let newZ = getHighestZ() + 1;
            menu.style.zIndex = String(newZ + 1);
        }
        menuVisible = !menuVisible;
    };

    function setPosition(origin: { top: number, left: number }) {
        menu.style.left = `${origin.left}px`;
        menu.style.top = `${origin.top}px`;
        toggleMenu("show");
    };

    window.addEventListener("click", function(e) {
        if (menuVisible) toggleMenu("hide");
    });

    window.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        const origin = {
            left: e.pageX,
            top: e.pageY
        };
        setPosition(origin);
        return false;
    });

    let outfitAdder = document.getElementById("outfitAdder");
    outfitAdder ?.addEventListener("click", function(e) {
        globalThis.outfitStore.insert();
    });
}

main();
