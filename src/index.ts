import { ArticleStore, loadJSONFiles } from './article'
import { OutfitStore } from './outfit'

function main(): void {
    let outfitContainer = document.getElementById("outfitContainer") as HTMLDivElement;
    let articleContainer = document.getElementById("articleContainer") as HTMLDivElement;
    let fileSelector = document.getElementById("fileSelector") as HTMLInputElement;
    const menu = document.querySelector(".menu") as HTMLElement;

    if (!outfitContainer || !articleContainer || !fileSelector || !menu) {
        console.log("Unable to init app");
        return;
    }

    globalThis.articleStore = new ArticleStore(articleContainer);
    globalThis.outfitStore = new OutfitStore(outfitContainer);
    fileSelector.addEventListener("change", loadJSONFiles);

    // Menu logic
    let menuVisible = false;
    function toggleMenu(command: string) {
        menu.style.display = command === "show" ? "block" : "none";
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
    outfitAdder?.addEventListener("click", function(e) {
        globalThis.outfitStore.insert();
    });
}

main();
